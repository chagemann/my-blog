---
layout: single
title:  "Cleanup GitHub workflows jobs"
date:   2024-09-11 14:27:21 +1000
categories: github automation housekeeping
show_date: true
excerpt: Automating the cleanup of GitHub workflow runs can save valuable time and keep your repository organized. Instead of manually deleting outdated or failed workflow runs through GitHub's UI, which lacks bulk selection, you can set up a scheduled job using GitHub Actions.
---

GitHub Actions provide a powerful way to automate various processes, but managing workflow runs can become burdensome when outdated or failed runs accumulate over time. GitHub's UI offers a manual cleanup method, but it lacks bulk selection capabilities, making the process tedious and time-consuming, particularly for larger repositories. Without regular maintenance, old workflow runs can clutter your repository, obscure relevant data, and consume unnecessary storage space.

A more efficient approach is to automate this cleanup process by scheduling a GitHub Actions workflow that regularly deletes outdated workflow runs. By leveraging GitHub’s CLI, you can set up a daily job to handle the cleanup automatically.

To implement this:

1. Create a file named `cleanup.yaml` in the `.github/workflows/` directory of your repository.

1. Add the following configuration to it:

{% include codeHeader.html %}
```yaml
name: Cleanup old workflow runs

on:
  schedule:
    - cron: '0 0 * * *' # Runs daily at midnight UTC
  workflow_dispatch:    # Allows manual triggering from GitHub UI

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout the repository
        uses: actions/checkout@v3

      - name: Install jq
        run: sudo apt-get install jq
        
      - name: List and delete old (>28 days) workflow runs
        run: |
          gh run list --limit 200 --json databaseId,createdAt |
          jq -r '[.[] | select((now - (.createdAt | fromdateiso8601)) > (28 * 24 * 60 * 60))] | .[].databaseId' |
          xargs -I ID gh run delete ID
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: List and delete all failed workflow runs
        run: |
          gh run list --limit 200 --json databaseId,status,conclusion |
          jq -r '[.[] | select(.status == "completed" and .conclusion == "failure")] | .[].databaseId' |
          xargs -I ID gh run delete ID
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```


### Key Points

1. The workflow runs daily at midnight UTC, as specified by the cron expression.

1. The `jq` tool is used to filter and process workflow runs based on their creation date and status.

1. The first step deletes workflow runs older than 28 days (this can be adjusted as needed).

1. The second step deletes all failed workflow runs.

By implementing this configuration, you ensure that old and failed workflow runs are automatically cleaned up, keeping your repository organized and reducing manual maintenance efforts.

[Here is an example](https://github.com/ibm-security-verify/verify-sdk-android/blob/main/.github/workflows/cleanup.yaml) to see it in action.

---

_"Don't find faults, find a remedy."_
<br/><br/>
-- Henry Ford
{: style="text-align: center;"}