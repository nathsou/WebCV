## WebCV - Blazingly fast computer vision in the browser

WebCV is a [computer vision](https://en.wikipedia.org/wiki/Computer_vision) library written in [TypeScript](http://www.typescriptlang.org/)
and compiled into JavaScript, it uses the [WebGL](https://developer.mozilla.org/en/docs/Web/API/WebGL_API) API and it's GLSL ES 2.0 capacities
in order to apply filters to images using the GPU.

# The basics

- Creating a *Context*
The *Context* class initiates some default GLSL vertex and fragment shaders required for any GLSL program.

In order to create a *Context*, one needs to provide WebCV with an HTML5 canvas element and at least one image :

	```javascript
	var tex = new wcv.Texture('.landscape'),
		ctx = new wcv.Context('#canvas', tex);
		
	var fragmentShader = ctx.fs,
		vertexShader = ctx.vs;
		
	//manipulate the shaders...
	```
	
One can then access some public variables from the vertex and fragment shaders :
	```javascript
	var pinkify = vec4(0.4, 0, 0.4, 1);
	
	ctx.fragColor.set(ctx.fragColor.add(pinkify)); //La vie en rose
	```

Once every instructions given, one needs to call the *render()* function of the given Context to run the program, so that we have :

	```javascript
	var tex = new wcv.Texture('#lena'),
		ctx = new wcv.Context('#canvas', tex);
		
	var pinkify = vec4(0.4, 0, 0.4, 1);
	
	ctx.fragColor.set(ctx.fragColor.add(pinkify)); //La vie en rose
		
	ctx.render();	
	```
	
The above example uses builtin wcv functions to manipulate the underlying shaders, however, if you want and know how to, you can 
edit the programs directly in GLSL ES 2.0 :

	```javascript
		
		var tex = new wcv.Texture('#lena'),
			ctx = new wcv.Context('#canvas', tex);
	
		ctx.fs.main.append(
			'vec4 pinkify = vec4(0.4, 0, 0.4, 1)',
			'fragColor = fragColor + pinkify'
		);
	```
	
both of the above will produce the following result :

![lena_pinkifify](demo/images/pinkify.png)
	
