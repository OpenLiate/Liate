import type {
  RepoContext,
  RepoIssue,
  RepoOptions,
  RepoPullRequest,
  RepoRelease
} from "@/layers/integration/repo/resolver";

export async function getGitHubRepoContext(repoSlug: string, options?: RepoOptions): Promise<RepoContext> {
  const cleanRepo = repoSlug
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "");
  let branch = "main";
  let files: string[] = [];
  let readme = "";
  let recentCommits: string[] = [];
  let issues: RepoIssue[] = [];
  let pullRequests: RepoPullRequest[] = [];
  let releases: RepoRelease[] = [];

  const headers: Record<string, string> = {
    "User-Agent": "Liate-Agent-Runtime",
    Accept: "application/vnd.github+json"
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const repoRes = await fetch(`https://api.github.com/repos/${cleanRepo}`, { headers });
    if (repoRes.ok) {
      const repoData: any = await repoRes.json();
      if (repoData.default_branch) branch = repoData.default_branch;
    }
  } catch {}

  try {
    const treeRes = await fetch(
      `https://api.github.com/repos/${cleanRepo}/git/trees/${branch}?recursive=1`,
      { headers }
    );
    if (treeRes.ok) {
      const treeData: any = await treeRes.json();
      if (Array.isArray(treeData.tree)) {
        files = treeData.tree.map((f: any) => f.path).slice(0, 100);
      }
    }
  } catch {}

  try {
    const commitLimit = typeof options?.commits === "number" ? options.commits : 5;
    const commitsRes = await fetch(
      `https://api.github.com/repos/${cleanRepo}/commits?per_page=${commitLimit}`,
      { headers }
    );
    if (commitsRes.ok) {
      const commitsData: any = await commitsRes.json();
      if (Array.isArray(commitsData)) {
        recentCommits = commitsData.map(
          (c: any) => `${String(c.sha || "").slice(0, 7)} ${String(c.commit?.message || "").split("\n")[0]}`
        );
      }
    }
  } catch {}

  try {
    const readmeRes = await fetch(`https://raw.githubusercontent.com/${cleanRepo}/${branch}/README.md`);
    if (readmeRes.ok) readme = (await readmeRes.text()).slice(0, 2000);
  } catch {}

  if (options?.issues) {
    const limit = typeof options.issues === "number" ? options.issues : 5;
    try {
      const res = await fetch(
        `https://api.github.com/repos/${cleanRepo}/issues?state=open&per_page=${limit}`,
        { headers }
      );
      if (res.ok) {
        const data: any[] = await res.json();
        issues = data
          .filter((i) => !i.pull_request)
          .map((i) => ({
            number: i.number,
            title: i.title,
            state: i.state,
            author: i.user?.login,
            labels: (i.labels || []).map((l: any) => l.name),
            createdAt: i.created_at,
            url: i.html_url
          }));
      }
    } catch {}
  }

  if (options?.pulls) {
    const limit = typeof options.pulls === "number" ? options.pulls : 5;
    try {
      const res = await fetch(
        `https://api.github.com/repos/${cleanRepo}/pulls?state=open&per_page=${limit}`,
        { headers }
      );
      if (res.ok) {
        const data: any[] = await res.json();
        pullRequests = data.map((p) => ({
          number: p.number,
          title: p.title,
          state: p.state,
          author: p.user?.login,
          draft: p.draft,
          createdAt: p.created_at,
          url: p.html_url
        }));
      }
    } catch {}
  }

  if (options?.releases) {
    const limit = typeof options.releases === "number" ? options.releases : 3;
    try {
      const res = await fetch(
        `https://api.github.com/repos/${cleanRepo}/releases?per_page=${limit}`,
        { headers }
      );
      if (res.ok) {
        const data: any[] = await res.json();
        releases = data.map((r) => ({
          tag: r.tag_name,
          name: r.name || r.tag_name,
          publishedAt: r.published_at
        }));
      }
    } catch {}
  }

  return {
    repo: cleanRepo,
    branch,
    files,
    readme,
    recentCommits,
    issues: issues.length ? issues : undefined,
    pullRequests: pullRequests.length ? pullRequests : undefined,
    releases: releases.length ? releases : undefined
  };
}
