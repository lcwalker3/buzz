import type { Repo } from "./use-repos";
import type { RepoRefs } from "./use-repo-refs";
import type {
  BlobView,
  CommitInfo,
  ReadmeResult,
  TreeEntry,
} from "./git-client";

const now = Math.floor(Date.now() / 1000);
const people = {
  ada: "1".repeat(64),
  grace: "2".repeat(64),
  linus: "3".repeat(64),
  margaret: "4".repeat(64),
};

/** Local-only data for previewing the populated repositories state. */
export const mockRepos: Repo[] = [
  {
    id: "buzz-desktop",
    name: "buzz-desktop",
    description:
      "The desktop client for collaborating with people and agents across Buzz communities.",
    cloneUrls: ["https://example.com/buzz-desktop.git"],
    webUrl: null,
    channelId: null,
    owner: people.ada,
    contributors: [people.grace, people.linus],
    createdAt: now - 60 * 24,
  },
  {
    id: "agent-harness",
    name: "agent-harness",
    description:
      "Tools and shared workflows for launching and coordinating coding agents.",
    cloneUrls: ["https://example.com/agent-harness.git"],
    webUrl: null,
    channelId: null,
    owner: people.grace,
    contributors: [people.ada, people.margaret],
    createdAt: now - 60 * 60 * 3,
  },
  {
    id: "relay-infrastructure",
    name: "relay-infrastructure",
    description:
      "Infrastructure and deployment configuration for community relays.",
    cloneUrls: ["https://example.com/relay-infrastructure.git"],
    webUrl: null,
    channelId: null,
    owner: people.linus,
    contributors: [people.margaret],
    createdAt: now - 60 * 60 * 24 * 2,
  },
  {
    id: "design-system",
    name: "design-system",
    description: "Shared foundations, components, and interaction patterns.",
    cloneUrls: ["https://example.com/design-system.git"],
    webUrl: null,
    channelId: null,
    owner: people.margaret,
    contributors: [people.ada, people.grace, people.linus],
    createdAt: now - 60 * 60 * 24 * 8,
  },
];

export function getMockRepo(repoId: string): Repo | undefined {
  if (!import.meta.env.DEV) return undefined;
  return mockRepos.find((repo) => repo.id === repoId);
}

const DIR = "040000";
const FILE = "100644";

function dir(name: string, n: number): TreeEntry {
  return { name, type: "tree", mode: DIR, oid: n.toString(16).repeat(40) };
}
function file(name: string, n: number): TreeEntry {
  return { name, type: "blob", mode: FILE, oid: n.toString(16).repeat(40) };
}

/** Mock trees keyed by directory path ("" is the root). */
const mockTrees: Record<string, TreeEntry[]> = {
  "": [
    dir("docs", 1),
    dir("src", 2),
    file("LICENSE", 3),
    file("README.md", 4),
    file("package.json", 5),
  ],
  src: [dir("components", 6), file("App.tsx", 7), file("main.tsx", 8)],
  "src/components": [file("RepoCard.tsx", 9)],
  docs: [file("README.md", 11), file("getting-started.md", 10)],
};

/** Every mock file path, for the "Go to file" finder. */
export function getMockFileList(): string[] {
  return Object.entries(mockTrees).flatMap(([dirPath, entries]) =>
    entries
      .filter((e) => e.type === "blob")
      .map((e) => (dirPath ? `${dirPath}/${e.name}` : e.name)),
  );
}

const mockDocsReadme =
  "# Docs\n\nGuides for working on this project. Start with **getting-started.md**.\n";

/** README for a mock folder: the root one, or the docs folder's. */
export function getMockReadme(path: string): ReadmeResult | null {
  if (path === "") return mockRepoReadme;
  if (path === "docs")
    return { filename: "README.md", content: mockDocsReadme };
  return null;
}

export function getMockTree(path: string): TreeEntry[] | undefined {
  return mockTrees[path.replace(/^\/+|\/+$/g, "")];
}

export const mockRepoRefs: RepoRefs = {
  branches: ["main", "develop", "feat/huddle-notes"],
  tags: ["v0.1.0", "v0.2.0"],
  head: { ref: "main", sha: "a".repeat(40) },
};

const day = 60 * 60 * 24;
export const mockRepoCommits: CommitInfo[] = [
  ["a", "Polish repository browsing styles", "Ada", 60 * 24],
  ["b", "Add repository empty states", "Grace", 60 * 60 * 5],
  [
    "c",
    "Support nested folder navigation\n\nAdds breadcrumbs.",
    "Ada",
    day + 3600,
  ],
  ["d", "Show line numbers in the file viewer", "Linus", day + 7200],
  ["e", "Fix clone URL copy on Safari", "Margaret", day * 3],
  ["f", "Bump dependencies", "Grace", day * 6],
].map(([c, message, name, ago]) => ({
  oid: String(c).repeat(40),
  message: String(message),
  author: {
    name: String(name),
    email: `${String(name).toLowerCase()}@example.com`,
    timestamp: now - Number(ago),
  },
}));

export const mockRepoReadme: ReadmeResult = {
  filename: "README.md",
  content:
    "# Buzz Desktop\n\nA focused community for people and agents to collaborate.\n\n## Getting started\n\nInstall dependencies, then start the development app.\n\n```bash\npnpm install\npnpm dev\n```\n\n## Contributing\n\n- Read the [docs](docs/) and the [getting started guide](docs/getting-started.md)\n- The app entry point is [`src/main.tsx`](./src/main.tsx#L5)\n- Jump back to [Getting started](#getting-started)\n",
};

const mockFiles: Record<string, string> = {
  "src/main.tsx": `import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`,
  "src/App.tsx": `import { RepoCard } from "./components/RepoCard";

export function App() {
  return (
    <main>
      <h1>Repositories</h1>
      <RepoCard name="buzz-desktop" />
    </main>
  );
}
`,
  "src/components/RepoCard.tsx": `export function RepoCard({ name }: { name: string }) {
  return <article className="repo-card">{name}</article>;
}
`,
  LICENSE:
    "Apache License\nVersion 2.0, January 2004\nhttp://www.apache.org/licenses/\n",
};

export function getMockBlob(
  repoId: string,
  filepath: string,
): BlobView | undefined {
  if (!getMockRepo(repoId)) return undefined;

  if (filepath === "README.md") {
    return {
      kind: "markdown",
      content: mockRepoReadme.content,
      sizeBytes: mockRepoReadme.content.length,
    };
  }

  if (filepath === "docs/README.md") {
    return {
      kind: "markdown",
      content: mockDocsReadme,
      sizeBytes: mockDocsReadme.length,
    };
  }

  if (filepath === "docs/getting-started.md") {
    const content =
      "# Getting started\n\n1. Clone the repository\n2. Run `pnpm install`\n3. Run `pnpm dev`\n";
    return { kind: "markdown", content, sizeBytes: content.length };
  }

  if (filepath === "package.json") {
    const content = `${JSON.stringify(
      {
        name: repoId,
        private: true,
        scripts: { dev: "vite", build: "tsc && vite build" },
      },
      null,
      2,
    )}\n`;
    return { kind: "text", content, sizeBytes: content.length };
  }

  const content = mockFiles[filepath];
  if (content !== undefined) {
    return { kind: "text", content, sizeBytes: content.length };
  }

  return undefined;
}
