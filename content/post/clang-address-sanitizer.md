---
title: "Using LLVM AddressSanitizer to Detect Overflows"
date: 2019-05-08T20:50:00-08:00
---
One topic of security that has perked my interest for a while is [fuzzing](https://en.wikipedia.org/wiki/Fuzzing). It's certainly not a new topic and although I've been aware of it, I haven't really done that much hands on work with it outside of web application fuzzing. In this post, I wanted to get the very basics of using fuzzing as a building block for exploit development.

Recently browsing the Twitterverse I came across a couple of great resources on fuzzing. Those are:

- [Generating Software Tests](https://www.fuzzingbook.org) by Andreas Zeller, Rahul Gopinath, Marcel Böhme, Gordon Fraser and Christian Holler
- [fuzzing.io](http://fuzzing.io/) by Richard Johnson

I had't made it far into "Generating Software Tests" and learned something I thought would be neat to play with and share; [LLVM's AddressSanitizer](https://clang.llvm.org/docs/AddressSanitizer.html). As stated in it's documentation, AddressSanitizer is capable of detecting all sorts of memory out-of-bounds accesses, use-after-free, leaks, etc.

I figured I would use the Protostar code because I have it handy and it's easy to reason about. Let's start with trying out AddressSanitizer on the [Stack 5 exercise](https://old.liveoverflow.com/binary_hacking/protostar/stack5.html).

The code for `stack5.c` is as follows:

```c
#include <stdlib.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main(int argc, char **argv)
{
  char buffer[64];

  gets(buffer);
}
```

Then we can compile it using Clang. I'll note we're using 64-bit here and not the historical 32-bit that Protostar exercises were using.

```console
$ clang -fsanitize=address -g -o stack5 stack5.c  
stack5.c:10:3: warning: implicit declaration of function 'gets' is invalid in C99 [-Wimplicit-function-declaration]
  gets(buffer);
  ^
1 warning generated.
/tmp/stack5-3f7da1.o: In function `main':
stack5.c:10: warning: the `gets' function is dangerous and should not be used.
```

Lets say we were looking for new potential areas for an exploit; ignoring that this program is extremely simple. A naive approach for our first fuzzing program might look something like this:

```python
import os
import subprocess
import string
import struct

for i in range(0, len(string.ascii_uppercase)):
    padding = ""
    for j in range(0, i+1):
        # using 8 repeated ascii characters to represent same size as an address on 64-bit
        padding += string.ascii_uppercase[j] * 8 
    print("trying padding: " + padding)
    cproc = subprocess.run(["./stack5"], input=bytes(padding, "utf-8"))
    if cproc.returncode > 0:
        print(cproc)
        os._exit(0)
```

For each loop iteration, it runs `./stack5` and just sends progressively longer chunks of alphabet strings into `stdin`. Before we try this out lets also add the `-fno-omit-frame-pointer` to compiling, which should give us an indication of where exactly the bug is detected.

```console
$ python3 stack5-fuzz.py 
trying padding: AAAAAAAA
trying padding: AAAAAAAABBBBBBBB
trying padding: AAAAAAAABBBBBBBBCCCCCCCC
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDD
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEE
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEEFFFFFFFF
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEEFFFFFFFFGGGGGGGG
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEEFFFFFFFFGGGGGGGGHHHHHHHH
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEEFFFFFFFFGGGGGGGGHHHHHHHHIIIIIIII
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEEFFFFFFFFGGGGGGGGHHHHHHHHIIIIIIIIJJJJJJJJ
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEEFFFFFFFFGGGGGGGGHHHHHHHHIIIIIIIIJJJJJJJJKKKKKKKK
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEEFFFFFFFFGGGGGGGGHHHHHHHHIIIIIIIIJJJJJJJJKKKKKKKKLLLLLLLL
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEEFFFFFFFFGGGGGGGGHHHHHHHHIIIIIIIIJJJJJJJJKKKKKKKKLLLLLLLLMMMMMMMM
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEEFFFFFFFFGGGGGGGGHHHHHHHHIIIIIIIIJJJJJJJJKKKKKKKKLLLLLLLLMMMMMMMMNNNNNNNN
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEEFFFFFFFFGGGGGGGGHHHHHHHHIIIIIIIIJJJJJJJJKKKKKKKKLLLLLLLLMMMMMMMMNNNNNNNNOOOOOOOO
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEEFFFFFFFFGGGGGGGGHHHHHHHHIIIIIIIIJJJJJJJJKKKKKKKKLLLLLLLLMMMMMMMMNNNNNNNNOOOOOOOOPPPPPPPP
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEEFFFFFFFFGGGGGGGGHHHHHHHHIIIIIIIIJJJJJJJJKKKKKKKKLLLLLLLLMMMMMMMMNNNNNNNNOOOOOOOOPPPPPPPPQQQQQQQQ
AddressSanitizer:DEADLYSIGNAL
=================================================================
==54726==ERROR: AddressSanitizer: SEGV on unknown address 0x000000000000 (pc 0x000000512232 bp 0x7ffcb669f610 sp 0x7ffcb669f4e0 T0)
==54726==The signal is caused by a READ memory access.
==54726==Hint: address points to the zero page.
    #0 0x512231 in main stack5.c:11:1
    #1 0x7ff5f4ac7b96 in __libc_start_main /build/glibc-OTsEL5/glibc-2.27/csu/../csu/libc-start.c:310
    #2 0x419d59 in _start (stack5+0x419d59)

AddressSanitizer can not provide additional info.
SUMMARY: AddressSanitizer: SEGV stack5.c:11:1 in main
==54726==ABORTING
CompletedProcess(args=['./stack5'], returncode=1)
```

Boom. So now we know there's memory violation in `stack5.c` on line 11. It happens when our input is greater than 132 characters. We could now take this information and dig deeper to see if we can craft a working exploit for the program.

For fun, we can also try this out on [Heap 0](https://old.liveoverflow.com/binary_hacking/protostar/heap0.html). We have to slightly modify this C code to get rid of the memory leaks, because AddressSanitizer will detect them.

The modified code of `heap0.c` now looks like this:

```c
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <stdio.h>
#include <sys/types.h>

struct data {
  char name[64];
};

struct fp {
  int (*fp)();
};

void winner()
{
  printf("level passed\n");
}

void nowinner()
{
  printf("level has not been passed\n");
}

int main(int argc, char **argv)
{
  struct data *d;
  struct fp *f;

  d = malloc(sizeof(struct data));
  f = malloc(sizeof(struct fp));
  f->fp = nowinner;

  printf("data is at %p, fp is at %p\n", d, f);

  strcpy(d->name, argv[1]);
  
  f->fp();

  free(f);
  free(d);
}
```

We can then construct a similar python script to generate inputs like we did above for the stack exercise.

```python
import os
import subprocess
import string
import struct

for i in range(0, len(string.ascii_uppercase)):
    padding = ""
    for j in range(0, i+1):
        padding += string.ascii_uppercase[j] * 8 
    print("trying padding: " + padding)
    cproc = subprocess.run(["./heap0", padding])
    if cproc.returncode > 0:
        print(cproc)
        os._exit(0)
```

Then we can compile the binary and run our script.

```console
$ clang -fsanitize=address -fno-omit-frame-pointer -g -o heap0 heap0.c
$ python3 heap0-fuzz.py 
trying padding: AAAAAAAA
data is at 0x606000000020, fp is at 0x602000000010
level has not been passed
trying padding: AAAAAAAABBBBBBBB
data is at 0x606000000020, fp is at 0x602000000010
level has not been passed
trying padding: AAAAAAAABBBBBBBBCCCCCCCC
data is at 0x606000000020, fp is at 0x602000000010
level has not been passed
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDD
data is at 0x606000000020, fp is at 0x602000000010
level has not been passed
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEE
data is at 0x606000000020, fp is at 0x602000000010
level has not been passed
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEEFFFFFFFF
data is at 0x606000000020, fp is at 0x602000000010
level has not been passed
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEEFFFFFFFFGGGGGGGG
data is at 0x606000000020, fp is at 0x602000000010
level has not been passed
trying padding: AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEEFFFFFFFFGGGGGGGGHHHHHHHH
data is at 0x606000000020, fp is at 0x602000000010
=================================================================
==3445==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x606000000060 at pc 0x0000004aad4c bp 0x7ffcddaba1a0 sp 0x7ffcddab9950
WRITE of size 65 at 0x606000000060 thread T0
    #0 0x4aad4b in __interceptor_strcpy.part.245 (heap0+0x4aad4b)
    #1 0x512204 in main heap0.c:36:3
    #2 0x7fa8689bab96 in __libc_start_main /build/glibc-OTsEL5/glibc-2.27/csu/../csu/libc-start.c:310
    #3 0x419d19 in _start (heap0+0x419d19)

0x606000000060 is located 0 bytes to the right of 64-byte region [0x606000000020,0x606000000060)
allocated by thread T0 here:
    #0 0x4d9bd0 in malloc (heap0+0x4d9bd0)
    #1 0x51215d in main heap0.c:30:7
    #2 0x7fa8689bab96 in __libc_start_main /build/glibc-OTsEL5/glibc-2.27/csu/../csu/libc-start.c:310

SUMMARY: AddressSanitizer: heap-buffer-overflow (heap0+0x4aad4b) in __interceptor_strcpy.part.245
Shadow bytes around the buggy address:
  0x0c0c7fff7fb0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x0c0c7fff7fc0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x0c0c7fff7fd0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x0c0c7fff7fe0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x0c0c7fff7ff0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
=>0x0c0c7fff8000: fa fa fa fa 00 00 00 00 00 00 00 00[fa]fa fa fa
  0x0c0c7fff8010: fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa
  0x0c0c7fff8020: fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa
  0x0c0c7fff8030: fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa
  0x0c0c7fff8040: fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa
  0x0c0c7fff8050: fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa
Shadow byte legend (one shadow byte represents 8 application bytes):
  Addressable:           00
  Partially addressable: 01 02 03 04 05 06 07 
  Heap left redzone:       fa
  Freed heap region:       fd
  Stack left redzone:      f1
  Stack mid redzone:       f2
  Stack right redzone:     f3
  Stack after return:      f5
  Stack use after scope:   f8
  Global redzone:          f9
  Global init order:       f6
  Poisoned by user:        f7
  Container overflow:      fc
  Array cookie:            ac
  Intra object redzone:    bb
  ASan internal:           fe
  Left alloca redzone:     ca
  Right alloca redzone:    cb
==3445==ABORTING
CompletedProcess(args=['./heap0', 'AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEEFFFFFFFFGGGGGGGGHHHHHHHH'], returncode=1)
```

Again, AddressSanitizer shows us exactly the point at which the overflow occurs. This is awesome! 

Now we've seen that it detected both a stack overflow and a heap overflow. For Protostar we obviously don't really need this to find a vulnerability. However, if we were analyzing something more complex written in C/C++ this could be really useful.

If you want to read more about AddressSanitizer there is lot documentation available in [Google's sanitizers repository on Github](https://github.com/google/sanitizers/wiki/AddressSanitizer).
