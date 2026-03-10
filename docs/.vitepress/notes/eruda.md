#### Eruda 

Eruda Console for mobile browsers [bookmarklet](https://wikipedia.org/wiki/Bookmarklet):
```
javascript:(function () { var script = document.createElement('script'); script.src="//cdn.jsdelivr.net/npm/eruda"; document.body.appendChild(script); script.onload = function () { eruda.init() } })();
```
