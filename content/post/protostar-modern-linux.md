---
title: "Protostar Exercises on Modern Linux"
date: 2018-12-20T18:29:00-08:00
---

Sometime in the past few months the `exploit-exercises.com` domain expired and you can no longer download the VMs from there. Which had me wondering, what would it take to simulate the exploitation experience on a more modern version of Linux. 

The original version used Debian 6.0 with kernel version 2.6.32. That is a while ago. Instead of installing an old version of Debian, we can start with Ubuntu 18.04 64-bit desktop and build up from there. First, we need libc development headers and I realized after some compiler errors that we also need `gcc-multilib` to be able to compile 32-bit binaries.

```console
$ sudo apt-get install -y linux-libc-dev gcc-multilib
```

Before we go into further detail we can grab the source for the `heap0` exercise from [LiveOverflow's page](https://liveoverflow.com/binary_hacking/protostar/heap0.html) and compile it like so:

```console
$ gcc -o heap0 -fno-stack-protector -z execstack -no-pie -g -m32 heap0.c 
```

To explain some of the key flags we've set, here's the breakdown:

- `-fno-stack-protector` disables stack protection and will allow us to easily perform buffer overflows
- `-z execstack` is passed to the linker and will make sure to allow executable code on the stack
- `-no-pie` disables Position-Independent Executable (PIE) which will keep global offsets more stable 
- `-g` add debugging information
- `-m32` generate a 32-bit binary

You can check to see the resulting binary is indeed 32-bit using `file`.

```console
$ file heap0
heap0: ELF 32-bit LSB shared object, Intel 80386, version 1 (SYSV), dynamically 
linked, interpreter /lib/ld-linux.so.2, for GNU/Linux 3.2.0, 
BuildID[sha1]=d9cbbe25e2b27217e102e61c682186a3657c3263, with debug_info, 
not stripped
```

Now lets execute it a few times.

```console
$ ./heap0 AAAA
data is at 0x9b19160, fp is at 0x9b191b0
level has not been passed
$ ./heap0 AAAA
data is at 0x87c3160, fp is at 0x87c31b0
level has not been passed
$ ./heap0 AAAA
data is at 0x8b78160, fp is at 0x8b781b0
level has not been passed
```

We can see that the heap pointers are not static values, as they were in the original exercises VM. This is because of Address Space Layout Randomization (ASLR). We need to disable it to keep the heap addresses from changing every time we execute. At this point, a lot of tutorials or Stack Overflow comments will tell you to do this:

```console
$ sysctl kernel.randomize_va_space
kernel.randomize_va_space = 2
$ sudo sysctl -w kernel.randomize_va_space=0
$ sysctl kernel.randomize_va_space
kernel.randomize_va_space = 0
```

However, this disables ASLR system wide. While this will certainly work, in my opinion there is a better alternative. Rather than disabling ASLR system wide, can we just disable it for this binary temporarily? Yes we can. The answer lies in a Linux kernel feature called [personality](http://man7.org/linux/man-pages/man2/personality.2.html). There's a specific binary in particular called [`setarch`](http://man7.org/linux/man-pages/man8/setarch.8.html) that allows us to modify the execution domain to emulate something significantly older than our current kernel. 

 We can use `setarch linux32 -R` when executing a specific binary. The chosen architecture being Linux 32-bit and the `-R` short flag to disable ASLR. Lets try it out.
 
 ```console
 $ setarch linux32 -R ./heap0 
data is at 0x804b160, fp is at 0x804b1b0
Segmentation fault (core dumped)
$ setarch linux32 -R ./heap0 
data is at 0x804b160, fp is at 0x804b1b0
Segmentation fault (core dumped)
```

The heap addresses are now nice and stable. Pretty cool, yeah?

What about using GDB? To use `setarch` within GDB, we can use `exec-wrapper`. 

```console
$ gdb ./heap0
Reading symbols from ./heap0...done.
(gdb) set exec-wrapper setarch linux32 -R
(gdb) p winner
$1 = {void ()} 0x80484b6 <winner>
(gdb) r AAAA
Starting program: /path/to/heap0 AAAA
data is at 0x804b160, fp is at 0x804b1b0
level has not been passed
[Inferior 1 (process 5827) exited normally]
```

Then after working towards a solution, hopefully you arrive here:

```console
$ setarch linux32 -R ./heap0 "$(python heap0.py)"
data is at 0x804b160, fp is at 0x804b1b0
level passed
```

### One Final Note
The stack addresses are going to be slightly off if you're comparing them to the ones shown in writeups or other solutions using the old VM. You'll have to do the work yourself to figure out what those are, but that's the point anyway.

I hope you found this post interesting. Good luck and have fun learning about exploitation!

