---
layout: single
title:  "My GitHub flow"
date:   2026-02-13 22:45:11 +1000
categories: git workflow release
show_date: true
excerpt: A feature branch that never died. Fixes mixed with refactors, half a feature in the middle, and a release deadline getting closer. This post describes the GitHub flow I now use to turn a messy development branch into a clean, reviewable release — without relying on "it seems to work".
---

Every developer has been there. At least, I have - more than once.

It always starts the same way: a clean branch, good intentions, and the quiet confidence that this time I'll keep things tidy and follow Git flow properly. And for a while, it works.

Then I fix a small bug. While I'm in the file, I clean something up. A few commits later I notice another thing that "really should be refactored anyway". At some point CI complains, so I tweak the build. None of these changes are big. None of them feel risky. The branch still builds, tests pass locally, and everything seems fine. Until it's time to ship...

That's when I realise I don't actually know what's in the branch anymore. I know it runs. I just can't confidently say what I'm about to release - or how I'd undo one part of it without undoing everything.

This article describes the GitHub flow I ended up using in exactly that situation. It's my approach of turning a large, messy development branch into a clean, reviewable release without relying on hope-for-best-merges. I've found it especially useful for SDKs and security-sensitive code, and it turns out it works just fine even when you're the only developer on the project.

## The branch that caused the problem

Let's call the branch `dev/messy` - it wasn't meant to be. It started life as a perfectly reasonable feature branch that I just never quite finished.

Over time I kept adding to it: a bug fix that touched authentication, a refactor of the credential parsing because the code was already open. A bit of Gradle tuning to get CI green again. And, sitting in the middle of all that, half a feature that turned out to be a lot more work than I'd expected.

None of these changes were bad on their own. Each one made sense at the time. The problem was that they were now tangled together.

If I merged the branch, I shipped everything - including the unfinished parts. If I didn't merge it, nothing shipped at all.

That's the trap.

![Dev messy branch vibes](https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3NsdHZ4bW5sMWhrNnVqNGpuZXpveWEwcTQyMWl0OWRkb2o2MDY3OCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Z1LYiyIPhnG9O/giphy.gif)

---

## The First Decision: don't merge the messy branch

The turning point was realising that `dev/messy` didn't actually need to be merged at all.

I stopped thinking of it as a branch with a destination and started treating it more like a source. It became the storage unit for changes, not the place where releases were made. Code could live there while it was evolving, changing shape, or waiting for a decision - but it no longer had to be "ready".

Once I let go of the idea that this branch needed a clean ending, the rest of the process fell into place.

---

## Introducing a release branch (and using it)

I created a release branch from `main`, for example:

```bash
git checkout main
git pull --ff-only
git checkout -b release/3.1.0
git push -u origin release/3.1.0
```

This branch had one rule: only changes I am willing to ship are allowed here.

No experiments. No "I'll clean this up later". If it landed on `release/3.1.0`, it was intentional.

---

## Small PRs, even when you're alone

Then, I started pulling changes out of `dev/messy`. For each fix or feature I wanted in the release, I created a short-lived branch from the release branch:

```bash
git checkout release/3.1.0
git pull --ff-only
git checkout -b pr/3.1.0-fix-token-expiry
```

That branch always started clean. Then I comitted *only* what I needed from `dev/messy`. Sometimes that was a straight cherry-pick:

```bash
git cherry-pick <commit-sha>
```

More often, it wasn't. Many commits were mixed. In those cases I literally checked out individual files or hunks and rebuilt the commit:

```bash
git checkout dev/messy -- src/auth/TokenRefresher.kt
git add -p
git commit -m "Fix token expiry when device clock is skewed"
```

Yes, it takes longer than merging. But it forces you to answer a useful question:

> "Is this really one change?"

If the answer was no, I split it.

---

## Why these PRs were still worth it

Even though I was the only developer, the PRs mattered.

They gave me a diff I could actually read.
They gave CI a clear signal.
They gave me a rollback point.

Most importantly, they stopped unrelated changes from leaking into the release.

Every PR went into `release/3.1.0`, never into `main` directly. I used **squash and merge** so each PR became a single commit. That way, the release branch history read like a list of decisions, not a diary.

After merging, the branch was deleted. No leftovers.

---

## Merging the release into `main`

Once all the pieces were in and CI was green, I opened one final PR:

```
release/3.1.0 → main
```

This one I merged with **Create a merge commit**, not squash.

I like being able to see, months later, exactly where a release landed. One merge commit marking "this is 3.1.0" is surprisingly useful when you-re debugging something long after the fact.

This merge is also where automation kicked in: build, test, tag, create a GitHub Release. No manual steps, no guessing which commit to tag.

---

## What this changed

A few practical things got better immediately.

1. Reverts became boring. If something went wrong, I could revert one commit or, in the worst case, revert the release merge.

1. CI failures were easier to reason about. If a PR broke something, it was obvious which change caused it.

1. Release notes stopped being creative writing. Each merged PR was already a sentence.

1. And I stopped feeling that low-grade anxiety before pressing "Merge".

---

## This isn't a silver bullet

This flow doesn't make bad code good. It doesn't replace tests. And it does add a bit of overhead when you're extracting changes from a messy branch. But that overhead shows up exactly when it's most valuable: right before a release. If you've ever stared at a branch with 80 changed files and thought, "I *think* this is fine," this approach gives you a way out that doesn't involve heroics.

You don't need to do it forever. You just need it when things get messy - which, in real projects, they always do.


---

{% include post-quote.html
   text="Don't ship shit."
   author="Linus Torvalds"
%}