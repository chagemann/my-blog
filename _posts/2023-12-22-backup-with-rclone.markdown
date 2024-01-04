---
layout: single
title:  "Backup with rclone"
date:   2023-12-22 22:54:00 +1000
categories: backup tools
show_date: true
---

I experienced an event recently, which caused me to review my backup strategy. I was "somehow" backing up my data to a cloud sync service. Yes, I'm aware `sync != backup`, but the cloud service stores X versions of the file, so it provides some protection against accidental data loss and accidentally encrypted files (you never know...). However, I wasn't backup my daily working files in the "Downloads" folder. I do my daily work there and when something is ready, I move it to a more suitable location.

Most people move their daily work folders to `iCloud` (or `Google Drive`). That's fine for syncing data across different devices, but it doesn't provide protection against accidental deletion. Also, if you backup that folder, you could run into problems, for example, with MacOS removes the file content and just leaves the metadata information there, to "optimize" hard drive storage.

## Backup strategy
The following strategy is not perfect, but it provides reasonable protection against data loss that is caused by hardware failure, deletion or data becoming unaccessible. It includes a daily, weekly, and monthly backup.

1. Daily backup<br/>
   Copy data from local working folder to a 'day-of-the-week' folder in my `iCloud Drive`. That primarily protects against data deletion and because it is technically a local copy - that iOS syncs with Apple's server afterwards - is usually done within 1 minute.
1. Weekly backup<br/>
   Copy all data from my `User` folder and the data that is backed up daily, into a weekly folder in a cloud-based storage service. As I copy all data, this takes longer than the daily backup. The advantage is, that I always have a full copy and don't need to fiddle around to collect different files from different (backup-)folders.
1. Monthly backup<br/>
   Same as weekly, but on an - obviously - different schedule.

## Tools
### rclone
I use [rclone](https://rclone.org/) for my backups. 

If you haven't heard of it: think of it as the Gandalf of data migration – you shall pass files seamlessly!  

Here is a short list of [what `rclone` can do](https://rclone.org/#what):
- Backup (and encrypt) files to cloud storage
- Restore (and decrypt) files from cloud storage
- Mirror cloud data to other cloud services or locally
- Migrate data to the cloud, or between cloud storage vendors
- Mount multiple, encrypted, cached, or diverse cloud storage as a disk
- Analyse and account for data that is held on cloud storage that uses lsf, ljson, size, ncdu
- Union file systems together to present multiple local and/or cloud file systems as one


Copying data locally - as I do for the daily backups - is straight forward. Here is my daily backup script:
{% include codeHeader.html %}
```bash
#!/bin/zsh

DATE_FOLDER=`date | cut -d' ' -f1`
/usr/local/bin/rclone copy /Users/carsten/ /Users/carsten/Library/Mobile\ Documents/com\~apple\~CloudDocs/Backup/$DATE_FOLDER --filter-from /Users/carsten/rclone/filter-from-daily.txt --max-size 50M --log-file ~/rclone/daily_$DATE_FOLDER.txt --log-level DEBUG
```

The `filter-from` feature passes a list of files/folders that you want to filter for the backup. Here is mine as an example:
{% include codeHeader.html %}
```bash
- build/**
- .idea/**
- .gradle/**
- .bin/**
- .DS_Store
+ Downloads/**
+ Desktop/**
- */**
```

- `-` excludes file or folder
- `+` includes file or folder
- `**` applies to all subfolders

For store data with cloud storage providers, `rclone` mounts the remote file system as a disk. Currently, over 70 cloud storage providers [are supported](https://rclone.org/#providers). 

When the remote file system is mounted, it can be used to transfer data like this:
{% include codeHeader.html %}
```bash
#!/bin/zsh

DATE_FOLDER="$(date +"%Y-%m-%d")"
/usr/local/bin/rclone copy /Users/carsten/ Cloud-Storage:Backup/Weekly/$DATE_FOLDER --filter-from /Users/carsten/rclone/filter-from-weekly.txt --log-file  ~/rclone/weekly_$DATE_FOLDER.txt --log-level INFO
```

The `filter-from` file follows the same structure as mentioned above.

One feature of `rclone` that I really like is, that it can serve the remote file system over HTTP (and others). This command
{% include codeHeader.html %}
```bash
rclone serve http Cloud-Storage:
```
allows you to browse through the remote file system with `http://localhost:8080`. 

### crontab
Apple recommends using `launchd` for scheduling time jobs. Crontab has been marked as `deprecated` for a few years, but is still available and will unlikely go away.

I added the following entries to my `crontab` scheduler to automate the runs:
```bash
45 9 * * * /Users/carsten/rclone/daily.sh
50 9 * * Fri /Users/carsten/rclone/weekly.sh
50 9 1 * * /Users/carsten/rclone/monthly.sh
```

## Summary
I described how to use `rclone` and `crontab` to configure a backup strategy that will create daily, weekly and monthly backups of your data.

I haven't implemented a clean-up job that deletes older files. This applies especially for the daily backup, as the script constantly adds new data to the backup folder, but never deletes anything.

---

_"Backups are love letters to your future self."_
{: style="text-align: center;"}