import { BeeField } from "./BeeField";
import buzzMark from "@/assets/invite/mark.svg";
import "./invite-page.css";
import { InviteCommunity } from "./InviteCommunity";
import { claimInviteInBrowser } from "@/features/invite/invite-api";
import { appDownloadUrl } from "@/shared/lib/app-download";
import { hasNip07Provider } from "@/shared/lib/nostr-signer";
import { relayWsUrl } from "@/shared/lib/relay-url";
import { Button } from "@/shared/ui/button";
import * as React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { InviteJoinPolicyNotice } from "./InviteJoinPolicyNotice";
import { APP_NAME } from "@/shared/brand";

type JoinPolicy = {
  terms_markdown?: string;
  privacy_markdown?: string;
  age_attestation_required: boolean;
  version: string;
};

type PolicyDocument = { title: string; markdown: string };

/** Convert relay invite sentinels into user-facing recovery guidance. */
function inviteClaimErrorMessage(message: string): string {
  if (message.includes("invite_restricted")) {
    return "This account, or the account that owns it, is restricted in this community. Contact a community administrator. If the restriction is temporary, try again after it ends.";
  }
  if (message.includes("invite_owner_mismatch")) {
    return "This account does not match its recorded owner. Use the correct account or owner identity to join this community.";
  }
  if (message.includes("invite_exhausted")) {
    return "This invite has reached its use limit. Ask for a new invite.";
  }
  if (message.includes("invite_expired")) {
    return "This invite has expired. Ask for a new invite.";
  }
  if (message.includes("invite_invalid")) {
    return "This invite is invalid. Check the link or ask for a new invite.";
  }
  return message;
}

/** Landing page for a community invite link (`/invite/<code>`). */
export function InvitePage({ code }: { code: string }) {
  const relay = relayWsUrl();
  const host = relay.replace(/^wss?:\/\//, "");
  const [policy, setPolicy] = React.useState<JoinPolicy | null | undefined>(
    undefined,
  );
  const [document, setDocument] = React.useState<PolicyDocument | null>(null);
  const [ageConfirmed, setAgeConfirmed] = React.useState(false);
  const [agreementConfirmed, setAgreementConfirmed] = React.useState(false);
  const [opening, setOpening] = React.useState(false);
  const [joiningBrowser, setJoiningBrowser] = React.useState(false);
  const [browserJoinError, setBrowserJoinError] = React.useState<string | null>(
    null,
  );
  const downloadUrl = appDownloadUrl();

  React.useEffect(() => {
    fetch("/api/join-policy")
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const config = (await response.json()) as { policy?: JoinPolicy };
        setPolicy(config.policy ?? null);
      })
      .catch(() => setPolicy(undefined));
  }, []);

  const acceptPolicy = async (): Promise<string | undefined> => {
    if (!policy) return undefined;
    const response = await fetch("/api/invites/accept-policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        policy_version: policy.version,
        age_confirmed: ageConfirmed,
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return ((await response.json()) as { receipt: string }).receipt;
  };

  const openInvite = async () => {
    setOpening(true);
    try {
      const receipt = await acceptPolicy();
      const query = new URLSearchParams({ relay, code });
      if (receipt) query.set("policy_receipt", receipt);
      window.location.href = `buzz://join?${query.toString()}`;
    } finally {
      setOpening(false);
    }
  };

  const joinInBrowser = async () => {
    setBrowserJoinError(null);
    setJoiningBrowser(true);
    try {
      const receipt = await acceptPolicy();
      await claimInviteInBrowser(code, receipt);
      window.location.assign("/");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not claim this invite.";
      setBrowserJoinError(inviteClaimErrorMessage(message));
    } finally {
      setJoiningBrowser(false);
    }
  };

  const browserSigningAvailable = hasNip07Provider();
  const disabled =
    policy === undefined ||
    opening ||
    joiningBrowser ||
    Boolean(policy?.age_attestation_required && !ageConfirmed) ||
    Boolean(
      policy &&
        (policy.terms_markdown || policy.privacy_markdown) &&
        !agreementConfirmed,
    );
  const hasPolicyRequirements = Boolean(
    policy &&
      (policy.age_attestation_required ||
        policy.terms_markdown ||
        policy.privacy_markdown),
  );
  const showDocument = (title: string, markdown: string) =>
    setDocument({ title, markdown });
  return (
    <div className="invite-page">
      <BeeField count={24} sizeScale={0.75} zIndex={-1} />
      <img className="invite-mark" src={buzzMark} alt={APP_NAME} />
      <div className="invite-stack">
        <div className="invite-card">
          <h1>You're invited</h1>
          <p className="invite-intro">Join your community on {APP_NAME}.</p>
          <InviteCommunity relay={relay} host={host} />

          <div
            className={`grid w-full max-w-md overflow-hidden transition-[grid-template-rows,margin,opacity,transform] duration-[220ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
              hasPolicyRequirements
                ? "mt-9 -mb-4 grid-rows-[1fr] opacity-100 translate-y-0"
                : "m-0 grid-rows-[0fr] opacity-0 -translate-y-1"
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              {policy && hasPolicyRequirements ? (
                <InviteJoinPolicyNotice
                  ageConfirmed={ageConfirmed}
                  agreementConfirmed={agreementConfirmed}
                  onAgeConfirmedChange={setAgeConfirmed}
                  onAgreementConfirmedChange={setAgreementConfirmed}
                  onShowDocument={showDocument}
                  policy={policy}
                />
              ) : null}
            </div>
          </div>

          <div className="invite-actions space-y-2">
            {browserSigningAvailable ? (
              <Button
                className="h-10 w-full bg-black text-white hover:bg-black/90 focus-visible:ring-black disabled:cursor-not-allowed disabled:bg-black/30 disabled:text-white/70"
                disabled={disabled}
                onClick={joinInBrowser}
              >
                {joiningBrowser ? "Joining…" : "Join in browser"}
              </Button>
            ) : null}
            {policy === null ? (
              <Button
                asChild
                className={`h-10 w-full ${
                  browserSigningAvailable
                    ? "border border-black bg-white text-black hover:bg-black/5"
                    : "bg-black text-white hover:bg-black/90 focus-visible:ring-black"
                }`}
              >
                <a
                  href={`buzz://join?relay=${encodeURIComponent(relay)}&code=${encodeURIComponent(code)}`}
                >
                  Accept invite in {APP_NAME}
                </a>
              </Button>
            ) : (
              <Button
                className={`h-10 w-full disabled:cursor-not-allowed disabled:bg-black/30 disabled:text-white/70 ${
                  browserSigningAvailable
                    ? "border border-black bg-white text-black hover:bg-black/5"
                    : "bg-black text-white hover:bg-black/90 focus-visible:ring-black"
                }`}
                disabled={disabled}
                onClick={openInvite}
              >
                Accept invite in {APP_NAME}
              </Button>
            )}
            {browserJoinError ? (
              <p className="text-sm text-red-700" role="alert">
                {browserJoinError}
              </p>
            ) : null}
          </div>
        </div>
        <p className="invite-download">
          Don&apos;t have the app?{" "}
          {downloadUrl ? (
            <a
              className="ml-1 font-medium text-black underline-offset-4 hover:text-black/70 hover:underline focus-visible:underline"
              href={downloadUrl}
              rel="noreferrer"
              target="_blank"
            >
              Download {APP_NAME}
            </a>
          ) : (
            <>Ask the person who invited you how to get {APP_NAME}.</>
          )}
        </p>
      </div>

      {document && (
        <div
          aria-label={document.title}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 text-left"
          role="dialog"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setDocument(null);
          }}
        >
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 text-black shadow-xl sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 className="text-xl font-semibold">{document.title}</h2>
              <button
                aria-label="Close"
                className="text-2xl leading-none text-black/60 hover:text-black"
                type="button"
                onClick={() => setDocument(null)}
              >
                ×
              </button>
            </div>
            <div className="prose prose-sm max-w-none">
              <Markdown remarkPlugins={[remarkGfm]}>
                {document.markdown}
              </Markdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
