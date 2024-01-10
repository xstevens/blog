---
title: "Fixing Metasploit install/upgrade(s) on Ubuntu 22.04"
date: 2023-01-09T12:45:00-08:00
---
Recently I noticed on an Ubuntu 22.04 based virtual machine I started to get a warning when attempting to update Metasploit.

```console
$ msfupdate
Switching to root user to update the package
[sudo] password for anon: 
Adding metasploit-framework to your repository list..Warning: apt-key is deprecated. Manage keyring files in trusted.gpg.d instead (see apt-key(8)).
OK
Updating package cache..W: http://downloads.metasploit.com/data/releases/metasploit-framework/apt/dists/lucid/InRelease: Key is stored in legacy trusted.gpg keyring (/etc/apt/trusted.gpg), see the DEPRECATION section in apt-key(8) for details.
OK
Checking for and installing update..
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
```

Not the end the world but it seemed odd that a default update script would produce warnings. First, I wanted to verify where `msfupdate` was from and make sure it wasn't out of date.

```console
$ which msfupdate
/usr/bin/msfupdate
$ ls -lh /usr/bin/msfupdate
lrwxrwxrwx 1 root root 27 Mar 28  2023 /usr/bin/msfupdate -> /etc/alternatives/msfupdate
$ ls -lh /etc/alternatives/msfupdate
lrwxrwxrwx 1 root root 39 Mar 28  2023 /etc/alternatives/msfupdate -> /opt/metasploit-framework/bin/msfupdate
$ ls -lh /opt/metasploit-framework/bin/msfupdate 
-rwxr-xr-x 1 root root 5.9K Dec 20 03:44 /opt/metasploit-framework/bin/msfupdate
```

Overall things looked fine there. I thought perhaps my install/update method was outdated and would go read the [official documentation](https://docs.metasploit.com/docs/using-metasploit/getting-started/nightly-installers.html) to see if there was an updated procedure there. I noticed another discrepancy. The official docs for a Debian/Ubuntu manual install should use [apt.metasploit.com](https://apt.metasploit.com/). As you may have also noticed, the current msfupdate was fetching from downloads.metasploit.com with a different directory structure. I don't know why Rapid7 has different domains used in documentation versus their install script, but my guess is someone forgot to change it. In any case both domains have DNS CNAME records to the same origin.

Next, I checked the "non-manual" nightly install script which is located at [https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb](). The content of this script is the exact same as my local `msfupdate` so we now know where that came from. We can verify that just to be sure.

```console
$ curl -L https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb > msfinstall
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  6034  100  6034    0     0  31890      0 --:--:-- --:--:-- --:--:-- 32095
$ sha256sum msfinstall 
f1d37c6517634d1cce1e7e022668179551bcbdc141a716d35ae4b03c19da126a  msfinstall
$ sha256sum /opt/metasploit-framework/bin/msfupdate 
f1d37c6517634d1cce1e7e022668179551bcbdc141a716d35ae4b03c19da126a  /opt/metasploit-framework/bin/msfupdate
```

This script is the origin of using the deprecated `apt-key` command and as a fair warning, if you run it will also overwrite any existing sources.list changes you may have made.

So lets start fixing things to see if we can't improve this a bit. The deprecation warning refers us to the man page for `apt-key`, so taking a look at that we get a bunch of confirmation that it's deprecated, but we also get a recommendation for where to put this key for the future (`/etc/apt/keyrings`).

```console
APT-KEY(8)                                                                  APT                                                                 APT-KEY(8)

NAME
       apt-key - Deprecated APT key management utility
...
DEPRECATION
       Except for using apt-key del in maintainer scripts, the use of apt-key is deprecated. This section shows how to replace existing use of apt-key.

       If your existing use of apt-key add looks like this:

       wget -qO- https://myrepo.example/myrepo.asc | sudo apt-key add -

       Then you can directly replace this with (though note the recommendation below):

       wget -qO- https://myrepo.example/myrepo.asc | sudo tee /etc/apt/trusted.gpg.d/myrepo.asc

       Make sure to use the "asc" extension for ASCII armored keys and the "gpg" extension for the binary OpenPGP format (also known as "GPG key public
       ring"). The binary OpenPGP format works for all apt versions, while the ASCII armored format works for apt version >= 1.4.

       Recommended: Instead of placing keys into the /etc/apt/trusted.gpg.d directory, you can place them anywhere on your filesystem by using the
       Signed-By option in your sources.list and pointing to the filename of the key. See sources.list(5) for details. Since APT 2.4, /etc/apt/keyrings is
       provided as the recommended location for keys not managed by packages. When using a deb822-style sources.list, and with apt version >= 2.4, the
       Signed-By option can also be used to include the full ASCII armored keyring directly in the sources.list without an additional file.
```

Funny thing with Linux distros is that everyone has their own opinions and on my host `/usr/share/keyrings` is being used rather than the recommendation ¯\_(ツ)_/¯. Either location seems fine, but we'll use `/usr/share/keyrings` for consistency on Ubuntu.

```console
$ sudo apt-key list
```

The last thing is if we do a general browse of the distro releases we'll notice that the ones listed on `apt.metasploit.com` are pretty old. Here's a the list as seen in January 2024 organized by distribution and release version.

- [Debian](https://www.debian.org/releases/)
    - 7 / wheezy
    - 8 / jessie
    - 10 / buster
    - unstable / sid
- [Ubuntu](https://wiki.ubuntu.com/Releases)
    - 10.04 / lucid (default)
    - 10.10 / maverick
    - 11.10 / oneiric
    - 12.04 / precise
    - 12.10 / quantal
    - 13.04 / raring
    - 13.10 / saucy
    - 14.04 / trusty
    - 14.10 / utopic
    - 15.04 / vivid
    - 15.10 / wily
    - 16.04 / xenial

One could argue this doesn't matter, as it seems to work regardless. Which is technically true, but having that many old releases is also not useful, especially when considering those releases are as far back as 2010. They seemed to have skipped over Debian 9 (Stretch) altogether and don't include any release for Ubuntu beyond 16.04 (Xenial Xerus). We'll pick the latest release available and hopefully can get support for specifying any Ubuntu 18.04+ release in the future. It would also be useful to dynamically determine the release version and have that be supported. For now we can hard code the release, but an example of doing it dynamically is shown below.

```console
$ echo "$(. /etc/os-release && printf ${VERSION_CODENAME-stretch})"
jammy
```

Combining all of the above into a new install_deb shell function we come up with the following:

```
install_deb() {
  LIST_FILE=/etc/apt/sources.list.d/metasploit-framework.list
  PREF_FILE=/etc/apt/preferences.d/pin-metasploit.pref
  echo -n "Adding metasploit-framework to your repository list.."
  echo "deb [signed-by=/usr/share/keyrings/metasploit.gpg] https://apt.metasploit.com xenial main" > $LIST_FILE
  print_pgp_key | sudo gpg --dearmor > /usr/share/keyrings/metasploit.gpg 
  if [ ! -f $PREF_FILE ]; then
    mkdir -p /etc/apt/preferences.d/
    cat > $PREF_FILE <<EOF
Package: metasploit*
Pin: origin apt.metasploit.com
Pin-Priority: 1000
EOF
  fi
  echo -n "Updating package cache.."
  apt-get update > /dev/null
  echo "OK"
  echo "Checking for and installing update.."
  apt-get install -y --allow-downgrades metasploit-framework
}
```

This gets us to a nice clean and warning free install. Happy hacking!
