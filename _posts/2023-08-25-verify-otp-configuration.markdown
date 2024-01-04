---
layout: single
title:  "Verify OTP configurations"
date:   2023-08-25 14:30:00 +1000
categories: otp troubleshooting tools oath
show_date: true
---

One-time passwords (OTP) are widely used as a 2nd factor to add an additional layer of security to your account’s login. Despite that its configuration is considered as "easy", it can be time-consuming to identify the reason if the generated password on server and client site don’t match. This article provides you guidance on troubleshooting that.

> This is a copy of an [article that I wrote for IBM](https://community.ibm.com/community/user/security/blogs/carsten-hagemann1/2019/04/26/verify-your-one-time-password-configuration).

### Common xOTP issues
1. One of the most common issues for TOTPs is, that the clock on server and client side are out of sync. The period for updating a TOTP is usually 30 seconds. Therefore, it is not sufficient that client and server clocks are synchronized to the same minute – they must not exceed a few (< 3) seconds. This can be easily achieved by using a Network Time Protocol (NTP) server to synchronize the clocks.
1. Another TOTP specific issue can be the timezone setting. The default to start counting the time steps is unix time T0, which is `00:00:00, 01. Jan 1970 UTC` – the important part here is UTC. Even if your device shows the correct time for your location, but the timezone setting is wrong, the device will calculate a false UTC time, based on these settings. The result is a TOTP for a different point in time.
1. The latter is especially relevant if you travel with your device across different time-zones. Depending on its configuration, time and time-zone settings are automatically updated by your telecommunication provider. Make sure to configure it correctly if you do it manually.
1. HOTPs don’t have these timing issues. However, once they got out of sync, it can be really cumbersome to bring client and server together again. The [HOTP standard](https://tools.ietf.org/html/rfc4226#section-7.4) describes a way to re-synchronize the counter by considering a window of e.g. the next 3 HOTPs and compare those against the value received from the client.


### Tools
The [OATH toolkit](https://www.nongnu.org/oath-toolkit/) (don’t confused it with OAuth) by the [Initiative for Open Authentication](https://openauthentication.org/), is a library that implements HOTP and TOTP and it comes with a command line tool called oathtool that provides a convenient way to call that library.


#### Installation
The installation for MacOs requires Homebrew (skip this if you have it already installed):
```bash
ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)" < /dev/null 2> /dev/null
```

and then:

```bash
brew install oath-toolkit
```

Binaries for other OS and the source code can be found [here](https://www.nongnu.org/oath-toolkit/download.html).

#### Usage
Generate a HOTP with secret `1234`:
```bash
$ oathtool 1234
376439
```

The same for TOTP:
```bash
$ oathtool --totp 1234
087756
```

TOTP, but with a different algorithm (default is HMAC-SHA1):
```bash
$ oathtool --totp=sha256 1234
787634
```

The `-w` (–window) parameter calculates the one-time passwords for additional counters. This is particularly useful to identify time sync issue.
```bash
$ oathtool --totp=sha256 -w 10 1234
787634
885016
008235
773801
037367
810324
930766
439333
257583
539815
267801
```

Use a base32 encoded secret:
```bash
$ oathtool --totp=sha256 -w 5 --base32 GEZDGNA
074312
348365
881930
341776
594313
```

Different period:
```bash
$ oathtool --totp=sha256 -w 5 --time-step-size=42 --base32 GEZDGNA
128324
153768
665196
472063
124992
185500
```

For a different point in time:
```bash
$ oathtool --totp=sha256 -w 5 --time-step-size=42 --base32 GEZDGNA --now="2019-01-01 00:00:00 UTC"
759395
477025
397995
070419
104372
957315
```

Verbose output:
```bash
$ oathtool --totp=sha256 -v --time-step-size=42 --base32 GEZDGNA --now="2019-01-01 00:00:00 UTC"
Hex secret: 31323334
Base32 secret: GEZDGNA=
Digits: 6
Window size: 0
Step size (seconds): 42
Start time: 1970-01-01 00:00:00 UTC (0)
Current time: 2019-01-01 00:00:00 UTC (1546300800)
Counter: 0x231C72D (36816685)
759395
```
The [manual of the OATH tool](https://www.nongnu.org/oath-toolkit/man-oathtool.html) describes these parameters more in detail.

In vary rare circumstances it could even be possible that the time, provided by the telecommunication provider is out of sync. That would calculate the wrong OTP, even you have turned on the time-sync feature on your phone. To verify that you can:

- Check the time against https://greenwichmeantime.com/
- Use the `-w` flag of the OATH tool to calculate OTP for a longer period of time - but make sure your laptop has the correct time set.


---

_"Nothing lasts as long as a temporary solution."_
{: style="text-align: center;"}