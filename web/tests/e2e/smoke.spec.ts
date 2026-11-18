import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

test("home page loads with The Hive branding", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("main").getByRole("img", { name: "The Hive" }),
  ).toBeVisible();
});

test("home page shows repositories section", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Repositories")).toBeVisible();
});

test("invite requires age and legal consent before opening The Hive", async ({
  page,
}) => {
  await page.route("**/api/join-policy", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        policy: {
          terms_markdown: "# Terms",
          privacy_markdown: "# Privacy",
          age_attestation_required: true,
          version: "policy-v1",
        },
      }),
    });
  });
  const githubRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname.endsWith("github.com"))
      githubRequests.push(request.url());
  });
  await page.goto("/invite/demo-code");

  // No public download is configured for this build: show guidance, never a
  // link to someone else's releases, and never call GitHub.
  await expect(
    page.getByText("Ask the person who invited you how to get The Hive."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Download The Hive" }),
  ).toHaveCount(0);
  expect(githubRequests).toEqual([]);

  const ageConfirmation = page.getByLabel("I am 18 years of age or older.");
  const agreementConfirmation = page.getByLabel(
    "I agree to the Terms of Service and Privacy Policy.",
  );
  const acceptInvite = page.getByRole("button", {
    name: "Accept invite in The Hive",
  });

  await expect(ageConfirmation).toBeVisible();
  await expect(agreementConfirmation).toBeVisible();
  await expect(acceptInvite).toBeDisabled();

  const termsLink = page.getByRole("button", { name: "Terms of Service" });
  const privacyLink = page.getByRole("button", { name: "Privacy Policy" });
  await expect(termsLink).toHaveCSS("text-decoration-line", "none");
  await expect(privacyLink).toHaveCSS("text-decoration-line", "none");
  await termsLink.hover();
  await expect(termsLink).toHaveCSS("text-decoration-line", "underline");
  await page.mouse.move(0, 0);
  await privacyLink.hover();
  await expect(privacyLink).toHaveCSS("text-decoration-line", "underline");

  await page
    .locator("label")
    .filter({ hasText: "I am 18 years of age or older." })
    .click();
  await expect(ageConfirmation).toBeChecked();
  await expect(acceptInvite).toBeDisabled();
  await page
    .locator("label")
    .filter({
      hasText: "I agree to the Terms of Service and Privacy Policy.",
    })
    .click({ position: { x: 8, y: 8 } });
  await expect(agreementConfirmation).toBeChecked();
  await expect(acceptInvite).toBeEnabled();

  const consentBox = await page
    .getByTestId("invite-join-policy-notice")
    .boundingBox();
  const acceptButtonBox = await acceptInvite.boundingBox();
  expect(consentBox?.y).toBeLessThan(acceptButtonBox?.y ?? 0);
  expect(consentBox?.width).toBe(acceptButtonBox?.width);
});

test("invite can enroll a NIP-07 identity for browser access", async ({
  page,
}) => {
  const pubkey = "ab".repeat(32);
  await page.addInitScript((extensionPubkey) => {
    (
      window as Window & {
        nostr?: {
          getPublicKey(): Promise<string>;
          signEvent(
            event: Record<string, unknown>,
          ): Promise<Record<string, unknown>>;
        };
      }
    ).nostr = {
      async getPublicKey() {
        return extensionPubkey;
      },
      async signEvent(event) {
        return {
          ...event,
          id: "cd".repeat(32),
          pubkey: extensionPubkey,
          sig: "ef".repeat(64),
        };
      },
    };
  }, pubkey);
  await page.route("**/api/join-policy", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ policy: null }),
    });
  });

  let claimObserved = false;
  await page.route("**/api/invites/claim", async (route) => {
    claimObserved = true;
    const request = route.request();
    const body = request.postData() ?? "";
    expect(JSON.parse(body)).toEqual({
      code: "browser-code",
    });

    const authorization = request.headers().authorization;
    expect(authorization).toMatch(/^Nostr /);
    const event = JSON.parse(
      Buffer.from(authorization.slice("Nostr ".length), "base64").toString(
        "utf8",
      ),
    ) as {
      pubkey: string;
      tags: string[][];
    };
    expect(event.pubkey).toBe(pubkey);
    expect(event.tags).toContainEqual(["u", request.url()]);
    expect(event.tags).toContainEqual(["method", "POST"]);
    expect(event.tags).toContainEqual([
      "payload",
      createHash("sha256").update(body).digest("hex"),
    ]);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "joined",
        community_id: "community-id",
        host: "127.0.0.1",
        role: "member",
      }),
    });
  });

  await page.goto("/invite/browser-code");
  await page.getByRole("button", { name: "Join in browser" }).click();
  await expect(page).toHaveURL("/");
  expect(claimObserved).toBe(true);
});

for (const [sentinel, guidance] of [
  [
    "invite_restricted",
    "This account, or the account that owns it, is restricted in this community. Contact a community administrator. If the restriction is temporary, try again after it ends.",
  ],
  [
    "invite_owner_mismatch",
    "This account does not match its recorded owner. Use the correct account or owner identity to join this community.",
  ],
]) {
  test(`invite shows recovery for ${sentinel} without automatically retrying`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.assign(window, {
        nostr: {
          async getPublicKey() {
            return "ab".repeat(32);
          },
          async signEvent(event: Record<string, unknown>) {
            return {
              ...event,
              id: "cd".repeat(32),
              pubkey: "ab".repeat(32),
              sig: "ef".repeat(64),
            };
          },
        },
      });
    });
    await page.route("**/api/join-policy", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ policy: null }),
      }),
    );
    let attempts = 0;
    await page.route("**/api/invites/claim", async (route) => {
      attempts++;
      expect(route.request().postDataJSON()).toEqual({ code: "browser-code" });
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: sentinel }),
      });
    });
    await page.goto("/invite/browser-code");
    const join = page.getByRole("button", { name: "Join in browser" });
    await join.click();
    await expect(page.getByRole("alert")).toHaveText(guidance);
    await expect(join).toBeEnabled();
    expect(attempts).toBe(1);
    await expect(page).toHaveURL(/\/invite\/browser-code$/);
    await join.click();
    await expect(page.getByRole("alert")).toHaveText(guidance);
    expect(attempts).toBe(2);
  });
}

test("invite shows community artwork and name with a text-only fallback", async ({
  page,
}) => {
  await page.route("**/api/join-policy", (route) =>
    route.fulfill({ json: { policy: null } }),
  );
  let metadata: { name: string; icon?: string } = {
    name: "Honeycomb Studios",
    icon:
      "data:image/svg+xml," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#D7D72E"/></svg>',
      ),
  };
  await page.route("http://127.0.0.1:4173/", (route) => {
    if (route.request().headers().accept === "application/nostr+json")
      return route.fulfill({ json: metadata });
    return route.continue();
  });
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/invite/visual-preview");
    await expect(page.locator(".invite-community")).toHaveText(
      "Honeycomb Studios",
    );
    await expect(page.locator(".invite-community-icon")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Accept invite in The Hive" }),
    ).toHaveAttribute(
      "href",
      "buzz://join?relay=ws%3A%2F%2F127.0.0.1%3A4173&code=visual-preview",
    );
    const widths = await page.evaluate(() => ({
      button: document
        .querySelector(".invite-actions a")
        ?.getBoundingClientRect().width,
      row: document.querySelector(".invite-actions")?.getBoundingClientRect()
        .width,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    expect(widths.button).toBe(widths.row);
    expect(widths.overflow).toBe(false);
  }
  metadata = { name: "Honeycomb Studios", icon: "/missing-community-icon.png" };
  await page.goto("/invite/visual-preview");
  await expect(page.locator(".invite-community")).toHaveText(
    "Honeycomb Studios",
  );
  await expect(page.locator(".invite-community-icon")).toBeHidden();
  metadata = { name: "Buzz Relay" };
  await page.goto("/invite/visual-preview");
  await expect(page.locator(".invite-community")).toHaveText("127.0.0.1:4173");
  await expect(page.locator(".invite-community-icon")).toHaveCount(0);
});

test("invite swarm follows width and height changes with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/join-policy", (route) =>
    route.fulfill({ json: { policy: null } }),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/invite/resize-preview");
  const positions = () =>
    page.locator(".cell-sprite").evaluateAll((sprites) =>
      sprites.map((sprite) => {
        const node = sprite.parentElement;
        const field = node?.parentElement;
        if (!node || !field) throw new Error("Missing cell field");
        const transform = new DOMMatrix(getComputedStyle(node).transform);
        return {
          x: transform.m41 / field.clientWidth,
          y: transform.m42 / field.clientHeight,
        };
      }),
    );
  await expect(page.locator(".cell-sprite")).toHaveCount(24);
  const original = await positions();
  for (const viewport of [
    { width: 700, height: 1000 },
    { width: 700, height: 700 },
    { width: 1800, height: 1200 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(async () => {
        const current = await positions();
        return Math.max(
          ...current.map((p, i) =>
            Math.max(
              Math.abs(p.x - original[i].x),
              Math.abs(p.y - original[i].y),
            ),
          ),
        );
      })
      .toBeLessThan(0.001);
    await expect(page.locator(".cell-sprite")).toHaveCount(24);
  }
});
