//! `communities create`: provision a new community through the relay's
//! operator API (`POST /operator/communities`).
//!
//! The relay owns provisioning (host row, owner membership, signing key); this
//! command only signs the request with an operator key (NIP-98) and prints the
//! relay's JSON receipt. The relay must list the key's public key in
//! `RELAY_OPERATOR_PUBKEYS` and set `RELAY_OPERATOR_API_ORIGIN` to the same
//! origin passed here.

use std::{io::Read, path::Path, time::Duration};

use anyhow::{ensure, Context, Result};
use nostr::{Keys, PublicKey};
use reqwest::{redirect::Policy, Method};
use serde_json::{json, Value};
use url::Url;

const PATH: &str = "/operator/communities";
const MAX_RESPONSE_BYTES: usize = 64 * 1024;
const MAX_KEY_FILE_BYTES: usize = 1024;

/// Create a community at `host` owned by `owner`, signed by the operator key
/// in `key_file`, against the relay at `origin`.
pub async fn run(origin: &str, key_file: &Path, host: &str, owner: &str) -> Result<i32> {
    let url = endpoint(origin)?;
    let host = crate::communities::normalize_host_authority(host).map_err(anyhow::Error::msg)?;
    let owner = parse_pubkey(owner)?;
    let body = serde_json::to_vec(&json!({
        "host": host,
        "initial_owner_pubkey": owner,
        "create_only": true,
    }))?;
    // Validate every input before reading the secret key.
    let keys = read_keys(key_file)?;
    let auth = crate::nip_fi_policy::authorization(&keys, &Method::POST, &url, Some(&body))?;

    let client = reqwest::Client::builder()
        .redirect(Policy::none())
        .retry(reqwest::retry::never())
        .timeout(Duration::from_secs(30))
        .build()?;
    let mut response = client
        .post(url)
        .header("Authorization", auth)
        .header("Content-Type", "application/json")
        .body(body)
        .send()
        .await
        .context("request to the relay failed; it is safe to run the command again")?;
    let status = response.status();
    let mut bytes = Vec::new();
    while let Some(chunk) = response.chunk().await.context("response interrupted")? {
        ensure!(
            bytes.len() + chunk.len() <= MAX_RESPONSE_BYTES,
            "response exceeds size limit"
        );
        bytes.extend_from_slice(&chunk);
    }
    let value: Option<Value> = serde_json::from_slice(&bytes).ok();
    if !status.is_success() {
        let reason = value
            .as_ref()
            .and_then(|v| v["error"].as_str().or_else(|| v["code"].as_str()))
            .unwrap_or("no details");
        anyhow::bail!("relay refused (HTTP {}): {reason}", status.as_u16());
    }
    let receipt = value.context("relay returned a non-JSON response")?;
    println!("{}", serde_json::to_string_pretty(&receipt)?);
    Ok(0)
}

fn endpoint(origin: &str) -> Result<Url> {
    let base = Url::parse(origin).context("invalid --origin")?;
    ensure!(
        matches!(base.scheme(), "http" | "https")
            && base.host_str().is_some()
            && base.username().is_empty()
            && base.password().is_none()
            && base.path() == "/"
            && base.query().is_none()
            && base.fragment().is_none(),
        "--origin must be an http(s) origin such as http://127.0.0.1:3000"
    );
    Ok(base.join(PATH)?)
}

/// Accept a 64-character hex public key or an `npub`.
fn parse_pubkey(input: &str) -> Result<String> {
    let input = input.trim();
    let key = if input.starts_with("npub1") {
        PublicKey::parse(input)
    } else {
        ensure!(
            input.len() == 64 && input.chars().all(|c| c.is_ascii_hexdigit()),
            "owner must be an npub or a 64-character hex public key"
        );
        PublicKey::parse(&input.to_ascii_lowercase())
    };
    Ok(key.context("invalid owner public key")?.to_hex())
}

fn read_keys(path: &Path) -> Result<Keys> {
    let mut bytes = Vec::new();
    std::fs::File::open(path)
        .with_context(|| format!("cannot open key file {}", path.display()))?
        .take((MAX_KEY_FILE_BYTES + 1) as u64)
        .read_to_end(&mut bytes)
        .with_context(|| format!("cannot read key file {}", path.display()))?;
    ensure!(bytes.len() <= MAX_KEY_FILE_BYTES, "key file is too large");
    std::str::from_utf8(&bytes)
        .ok()
        .and_then(|s| Keys::parse(s.trim()).ok())
        .context("key file must hold one nsec or 64-character hex secret key")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn endpoint_requires_bare_origin() {
        assert_eq!(
            endpoint("http://127.0.0.1:3000").unwrap().as_str(),
            "http://127.0.0.1:3000/operator/communities"
        );
        for bad in [
            "127.0.0.1:3000",
            "ftp://example.org",
            "http://user:pw@example.org",
            "http://example.org/api",
            "http://example.org/?a=1",
        ] {
            assert!(endpoint(bad).is_err(), "{bad} should be rejected");
        }
    }

    #[test]
    fn owner_accepts_hex_and_npub_only() {
        let keys = Keys::generate();
        let hex = keys.public_key().to_hex();
        let npub = nostr::ToBech32::to_bech32(&keys.public_key()).unwrap();
        assert_eq!(parse_pubkey(&hex.to_uppercase()).unwrap(), hex);
        assert_eq!(parse_pubkey(&npub).unwrap(), hex);
        assert!(parse_pubkey("abc").is_err());
        assert!(parse_pubkey("nsec1xyz").is_err());
    }

    #[test]
    fn key_file_must_hold_a_secret_key() {
        let dir = tempfile::tempdir().unwrap();
        let good = dir.path().join("good");
        std::fs::write(
            &good,
            format!("{}\n", Keys::generate().secret_key().to_secret_hex()),
        )
        .unwrap();
        assert!(read_keys(&good).is_ok());
        let bad = dir.path().join("bad");
        std::fs::write(&bad, "not a key").unwrap();
        assert!(read_keys(&bad).is_err());
        assert!(read_keys(&dir.path().join("missing")).is_err());
    }
}
