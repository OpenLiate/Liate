import { execSync } from "node:child_process";
import fs from "node:fs";
import { getLocalGitContext } from "@/layers/integration/repo/local-git";
import { getGitHubRepoContext } from "@/layers/integration/repo/github-api";

export interface RepoIssue {
  number: number;
  title: string;
  state: string;
  author?: string;
  labels?: string[];
  createdAt?: string;
  url?: string;
}

export interface RepoPullRequest {
  number: number;
  title: string;
  state: string;
  author?: string;
  draft?: boolean;
  createdAt?: string;
  url?: string;
}

export interface RepoRelease {
  tag: string;
  name: string;
  publishedAt?: string;
}

export interface RepoContext {
  repo: string;
  branch?: string;
  files?: string[];
  readme?: string;
  recentCommits?: string[];
  issues?: RepoIssue[];
  pullRequests?: RepoPullRequest[];
  releases?: RepoRelease[];
}

export interface RepoOptions {
  issues?: boolean | number;
  pulls?: boolean | number;
  commits?: boolean | number;
  releases?: boolean | number;
}

/**
 * Layer [I] GitHub & Local Git Repository Context Resolver
 */
export class Repo {
  public static async resolveContext(repoNameOrPath: string, options?: RepoOptions): Promise<RepoContext> {
    const isLocalDir =
      fs.existsSync(repoNameOrPath) ||
      repoNameOrPath === "." ||
      repoNameOrPath.startsWith("./") ||
      repoNameOrPath.startsWith("../");

    if (isLocalDir) {
      return this.getLocalContext(repoNameOrPath, options);
    }

    try {
      const gitRemote = execSync("git remote get-url origin", {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"]
      }).trim();
      if (gitRemote.includes(repoNameOrPath)) {
        return this.getLocalContext(".", options);
      }
    } catch {
      // Not in a matching local git repo
    }

    return this.getRemoteContext(repoNameOrPath, options);
  }

  public static getLocalContext(dir: string, options?: RepoOptions): RepoContext {
    return getLocalGitContext(dir, options);
  }

  public static async getRemoteContext(repoSlug: string, options?: RepoOptions): Promise<RepoContext> {
    return getGitHubRepoContext(repoSlug, options);
  }
}
