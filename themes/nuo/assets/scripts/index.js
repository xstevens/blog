// Selected DOM elements
var html = document.querySelector('html');
var body = document.querySelector('body');
var menuToggle = document.querySelector('.menu-toggle');
var menuIcon = document.querySelector('.icon-menu');
var siteMenu = document.querySelector('.site-menu');
var socialMenu = document.querySelector('.social-menu');
var toTopBtn = document.querySelector('.to-top');

// Site and social menu toggle
menuToggle &&
  menuToggle.addEventListener('click', function() {
    siteMenu.classList.toggle('collapsed');
    socialMenu.classList.toggle('collapsed');
    menuIcon.classList.toggle('icon-menu');
    menuIcon.classList.toggle('icon-close');
    var expandStatus = menuToggle.getAttribute('aria-expanded');
    if (expandStatus === 'false') menuToggle.setAttribute('aria-expanded', 'true');
    else menuToggle.setAttribute('aria-expanded', 'false');
  });

// Random emoji for 404 error message.
function randomErrorEmoji() {
  var error = document.getElementsByClassName('error-emoji')[0];
  var emojiArray = [
    '\\(o_o)/',
    '(o^^)o',
    '(˚Δ˚)b',
    '(^-^*)',
    '(≥o≤)',
    '(^_^)b',
    '(·_·)',
    "(='X'=)",
    '(>_<)',
    '(;-;)',
    '\\(^Д^)/',
  ];
  if (error) {
    var errorEmoji = emojiArray[Math.floor(Math.random() * emojiArray.length)];
    error.appendChild(document.createTextNode(errorEmoji));
  }
};
randomErrorEmoji();

// Show toTopBtn when scroll to 600px
/* eslint-disable no-undef */
var lastPosition = 0;
var ticking = false;
window.addEventListener('scroll', function() {
  lastPosition = body.scrollTop === 0 ? html.scrollTop : body.scrollTop;
  if (!ticking) {
    window.requestAnimationFrame(function() {
      if (toTopBtn != null) {
        if (lastPosition >= 600) {
          toTopBtn.classList.remove('is-hide');
        } else {
          toTopBtn.classList.add('is-hide');
        }
      }
      ticking = false;
    });
  }
  ticking = true;
});
