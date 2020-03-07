---
title: "SANS Holiday Hack Challenge 2019"
date: 2020-01-01T11:30:00-08:00
tags: ["ctf"]
---

Every year I look forward to spending a little time around the holidays playing SANS Holiday Hack Challenge. I typically don't finish all the levels, but I always learn a few things because it forces me into new areas to solve the challenges. This year it seemed like a bunch of the challenges were focused around defense, doing forensics and sifting through logs. I learned a fair amount about Powershell. The funnest challenge for me this year though was centered around physical security.

The particular challenge was "Objective 7: Get Access To the Steam Tunnels". The challenge starts by talking to a character named Minty Candycane after completing "Holiday Hack Trail". She talks about how we could make a copy of a physical key using [key biting](https://en.wikipedia.org/wiki/Bit_%28key%29). She also metions a talk by Deviant Ollam called ["Optical Decoding of Keys"](https://www.youtube.com/watch?v=KU6FJnbkeLA&feature=youtu.be) (great talk by the way).

We walk into her room on the far right. And we see a key cutting machine station. To the right, we see a door we can go into. It's a closet with a lock on the wall. Lets walk back out and see if we can find an elf or someone with a key. We quickly spot Krampus and then he's gone. However, we can pull the Krampus avatar image from the network log in our web console.

<a href="https://2019.kringlecon.com/images/avatars/elves/krampus.png"><img src="/images/sans-2019/krampus.png" alt="krampus" width="440" height="975"/></a>

Lets see if we can take the image with his key and get the keycode using [Deviant's decoding templates](https://github.com/deviantollam/decoding). First, what type of key is this? We can compare the shape of the "head" (not sure on terminology here) and see that this looks like a Schlage key. So we can try lining the key image up with the decoding template for Schlage keys.

We can use [Gimp](https://www.gimp.org) to work with layering the template on top of the key image. After a lot of layer scaling on the key we arrive at this.

![](/images/sans-2019/krampus-key-decoding.png)

This decodes to 1-2-2-5-2-0. We can then go back to the key cutting machine and punch in this into the key cutting machine.

![cutting machine](/images/sans-2019/key-cutting-machine.png)

It produces a key image shown below.

![generated key](/images/sans-2019/122520.png)

We can then take this key and unlock the door to the steam tunnels. At the end of the steam tunnels, we come across Krampus. If we talk to him, we find out his full name is Krampus Hollyfeld. Enter his name and objective is complete!

### Epilogue
This was a great challenge and I was impressed at how well they translated a physical challenge into something that could be done online. Hat tip to Deviant for his part in this and some awesome free educational materials I've watched over the years. Also a big thanks to Ed Skoudis and everyone over at SANS for all the hard work you do to create this event every year!
