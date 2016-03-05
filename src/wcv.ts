/*
WebCV: Blazingly fast computer vision in the browser

The MIT License (MIT)
Copyright (c) 2016 Nathan Soufflet <nathsou.fr@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/// <reference path="../definitions/es6-promise.d.ts" />

module wcv {
    export enum varType {void, float, string, vec2, vec3, vec4, sampler2D, bool, int, mat2, mat3, mat4};

    export enum shaderType {fragment = 35632, vertex = 35633};

    export let throwError = function(msg : any, throwIt? : boolean){
        console.warn('WCV : ' + msg);
		if(throwIt) throw msg;
        //alert(msg);
    };

    let textureCount = 0;

    export interface Callback {
        callback : Function,
        thisArg?
    }

	export let vectorType = function(u: Vector): string {

		let type: string;

		if (u.size === 1) {
			type = 'float';
		} else {
			type = 'vec' + u.size;
		}

		return type;
	};

    let imageToImageData = function(img : HTMLImageElement) : ImageData {

        let cnv = document.createElement('canvas'),
            ctx = cnv.getContext('2d');

        cnv.width = img.width;
        cnv.height = img.height;

        ctx.drawImage(img, 0, 0);

        return ctx.getImageData(0, 0, cnv.width, cnv.height);
    };

    let createImageData = function(data : Uint8ClampedArray, width : number, height : number) : ImageData {

        if (!(data instanceof Uint8ClampedArray)) {
            data = new Uint8ClampedArray(data);
        }

        if (ImageData) { //If current browser supports ImageData()
            return new ImageData(data, width, height);
        } else { //Otherwise, ceate a canvas context to get ImageData
            let cnv = document.createElement('canvas'),
                ctx = cnv.getContext('2d');
            let imd = <ImageData> ctx.createImageData(width, height);
			
			for (let i = 0; i < data.length; i++)
				imd.data[i] = data[i];
			
            return imd;
        }
    }

export class Texture {
        public img : HTMLImageElement;
        public name : string;
        private callacks : Callback[] = [];
		public width: number;
        public height : number;
		public id: WebGLTexture;

        constructor(img : HTMLImageElement | string) {

            this.name = 'u_image_' + (textureCount++);

            if(img instanceof HTMLImageElement) {

                this.img = img;

                this.onload(function(){
                    //this.data = imageToImageData(img);
                    this.width = img.width;
                    this.height = img.height;
                }, this);

                let that = this;

                this.img.onload = function() {
                    for(let cb of that.callacks) cb.callback.call(cb.thisArg);

                    that.callacks = [];
                };

            } else {
				this.img = document.querySelector(img as string) as HTMLImageElement; 
				this.width = this.img.width;
				this.height = this.img.height;
            }
        }

        loaded() : boolean {
            if(this.img)
                return this.img.complete;

            return true;
        }

        toString() : string {
            return this.name;
        }

        onload(callback : Function, thisArg? : any){

            if(this.loaded()) callback.call(thisArg || this);
            else this.callacks.push({callback: callback, thisArg: thisArg || this});
        }

		at(coord: Var | string): Vec4 { //Returns texture's color at coord
			return new Vec4(['texture2D(' + this.name + ', ' + coord + ')']);
		}
		
		destroy(gl: WebGLRenderingContext): void {
			gl.deleteTexture(this.id);
			this.id = null;
		}

    }

    class Block {
        public parent : Block;
        public lines : string[];
        protected children : Block[] = [];
        protected funcs : Func[] = [];
        public header : string[] = [];
        public footer : string[] = [];

        constructor(parent : Block){
            this.lines = [];
            this.parent = parent;
        }

        append(...lines: string[]): number {
			for (let line of lines) {
				let last = line.charAt(line.length - 1);
				if(last !== ';' && last !== '}' && last !== '{') line += ';';
				this.lines.push(line);
			}

            return this.lines.length - 1;
        }

        top(line : string) : number {
            let last = line.charAt(line.length - 1);
            if(last !== ';' && last !== '}') line += ';';
            this.header.unshift(line);
            return 0;
        }

        prepend(line : string) : number {
            let last = line.charAt(line.length - 1);
            if(last !== ';' && last !== '}') line += ';';
            this.header.push(line);
            return this.header.length - 1;
        }

        hasFunc(name : string) : boolean {

            for(let c of this.funcs)
                if(c.name === name) return true;

            return false;
        }


        addChild(child : Block) : void{

            if(child instanceof Func){
                this.funcs.push(child);
            }else{
                this.children.push(child);
            }
        }

        addChildren(...children : Block[]){
            for(let child of children){
                this.addChild(child);
            }
        }


        getCode() : string {

            let code = '';

            let that = this;

            for(let line of this.header){
                code += line + '\n';
            }

            for(let line of this.lines){
                code += line + '\n';
            }

            for(let child of this.children){
                code += child.getCode() + '\n';
            }

            //Sort funcs by precedence

            this.funcs.sort(function (a, b) {
               return b.precedence - a.precedence;
            });

            for(let func of this.funcs){
                code += func.getCode() + '\n';
            }

            for(let line of this.footer){
                code += line + '\n';
            }

            return code;
        }

    }

    export class Func extends Block {
        public name : string;
        public returnType : varType;
        public params : string = '';
        public precedence = 0;

        constructor(name : string, returnType : varType, params? : string, parent? : Block){
            super(parent || null);
            this.name = name;
            this.returnType = returnType;
            if(params) this.params = params;
        }

        getCode() : string{
            return varType[this.returnType] + ' ' + this.name + '(' + this.params + '){' + super.getCode() + '}';
        }

    }

    class Shader extends Block {
        public type : shaderType;
        public externals : ExternalVar[] = [];
        public main: Func;
		private webglShader: WebGLShader;

        constructor(type : shaderType, code?: string[]){
            super(null);
            this.type = type;
            if(code) this.lines = code;

            //Create the main function
            this.main = new Func('main', varType.void, '', this);
        }

        addFunction(func : Func) : void{
            if(!this.hasFunc(func.name))
                this.addChild(func);
        }

		addFunctions(funcs : Func[]) : void{
			for(let func of funcs){
				this.addFunction(func);
			}
		}

        compile(gl : WebGLRenderingContext){
            this.webglShader = gl.createShader(this.type);
            gl.shaderSource(this.webglShader, this.getCode());
            gl.compileShader(this.webglShader);

            if(!gl.getShaderParameter(this.webglShader, gl.COMPILE_STATUS)){
                throwError('Shader compilation exception');
                console.log(gl.getShaderInfoLog(this.webglShader));
            }

            return this.webglShader;
        }
		
		destroy(gl : WebGLRenderingContext) : void {
			gl.deleteShader(this.webglShader);
			this.webglShader = null;
		}

        //Get a function by its name
        f(name : string) : Func{


            for(var f of this.children){
                if(f instanceof Func){
                    if(f.name === name){
                        return f;
                    }
                }
            }

            return undefined;
        }

        declareExternals(prog : Prog) : void{
            for(let v of this.externals){
                v.declare(this);
            }
        }

        addExternal(ext : ExternalVar) : void{

            if(ext.declared) return;

            this.externals.push(ext);

            ext.declared = true;
        }

        linkExternals(prog : Prog) : void{
            for(let v of this.externals){
                v.link(prog);
            }
        }

        getCode() : string{
            return super.getCode() + this.main.getCode() + '\n';
        }

    }

    export class VertexShader extends Shader {

        public a_position : Attribute;
        public position : Vec4;
        private positionSet : boolean = false;

        constructor(code : string[] = []){
            super(shaderType.vertex, code);

            this.a_position = new Attribute(varType.vec2, 'a_position');
            this.a_position.declare(this);

            this.position = new Vec4(['vec4(' + this.a_position + ', 0.0, 1.0)']);
            this.position.name = 'position';
            this.position.declare(this.main);
        }

        getCode() : string{

            if(!this.positionSet){
                this.main.append('gl_Position = ' + this.position);
                this.positionSet = true;
            }

            return super.getCode();
        }

    }

    export enum precisionType {highp, mediump, lowp};

    export class FragmentShader extends Shader {

        public fragColor: Vec4;
		public texCoord : Varying;
        private colorSet : boolean = false;
        public hasTexture : boolean = false;
        private precision : string[] = [];

        constructor(code : string[] = []){
            super(shaderType.fragment, code);

            this.fragColor = new Vec4([1]);
            this.fragColor.name = 'fragColor';
            this.fragColor.declare(this.main);

			this.texCoord = new Varying(varType.vec2, 'v_texCoord');
			this.addExternal(this.texCoord);

            this.main.footer.push('gl_FragColor = ' + this.fragColor + ';');

        }

        setPrecision(type : varType, precision : precisionType){
            this.precision.push('precision ' + precisionType[precision] + ' ' + varType[type] + ';\n');
        }

        getCode() : string{
            if(!this.colorSet){
                //this.main.append('gl_fragColor = ' + this.fragColor);
                this.colorSet = true;
            }

            return this.precision.join('') + super.getCode();
        }

    }

    export interface Shaders {
        fragment : FragmentShader;
        vertex : VertexShader;
    }

    export class Prog {
        public gl : WebGLRenderingContext;
        public shaders : Shaders;
        public canvas : HTMLCanvasElement;
        public webglProgram : WebGLProgram;
        public compiled : boolean = false;
        private textures : Texture[] = [];

        constructor(canvas: HTMLCanvasElement | string | any, shaders: Shaders) {
            if(typeof(canvas) === 'string'){
                let cnv = document.getElementById(canvas);
                if (cnv instanceof HTMLCanvasElement)
                    this.canvas = cnv;
				else throwError("HTMLCanvasElement '#" + cnv + "' not found");
            }else if(canvas instanceof HTMLCanvasElement){
                this.canvas = canvas;
            }else{
                throwError("'canvas' argument must me an instance of HTMLCanvasElement or a string");
            }

            //Init the WebglRenderingContex

            this.gl = <WebGLRenderingContext> (this.canvas.getContext('webgl', {preserveDrawingBuffer: true}) 
                    || this.canvas.getContext('webgl-experiment', {preserveDrawingBuffer: true}));
                    
            //Init the Shaders
            this.shaders = shaders;
        }

        addTexture(tex : Texture){
            this.textures.push(tex);

            let texture = new Uniform(varType.sampler2D, tex.name);
            this.shaders.fragment.addExternal(texture);

            if(!this.shaders.fragment.hasTexture){

                //Allow texCoord communication between the vertex and the fragment shaders
                let v_texCoord = new Varying(varType.vec2, 'v_texCoord');
                this.shaders.vertex.addExternal(v_texCoord);
                //Normalize and flip
                this.shaders.vertex.main.append(v_texCoord + ' = ' +
                this.shaders.vertex.a_position + '.st * vec2(0.5, -0.5) + 0.5');

                this.shaders.fragment.fragColor.val('texture2D(' + tex + ', v_texCoord)');

                this.shaders.fragment.hasTexture = true;

                //Load the texture
				
                console.log(this.gl);
                
				tex.id = this.gl.createTexture();
				
                this.gl.bindTexture(this.gl.TEXTURE_2D, tex.id);

                // Set the parameters so we can render any size image.
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

                // Upload the image into the texture.
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, tex.img);
            }
        }

        compile(){

            this.shaders.vertex.declareExternals(this);
            this.shaders.fragment.declareExternals(this);

            console.log(this.shaders.vertex.getCode());
            console.log(this.shaders.fragment.getCode());

            this.webglProgram = this.gl.createProgram();
            this.gl.attachShader(this.webglProgram, this.shaders.vertex.compile(this.gl));
            this.gl.attachShader(this.webglProgram, this.shaders.fragment.compile(this.gl));
            this.gl.linkProgram(this.webglProgram);

            if(!this.gl.getProgramParameter(this.webglProgram, this.gl.LINK_STATUS)) {
                throwError("Unable to initialize the shader program.");
            }

            this.gl.useProgram(this.webglProgram);

            //Link external variables (uniforms, attributes..)

            this.shaders.vertex.linkExternals(this);
            this.shaders.fragment.linkExternals(this);

            this.compiled = true;
        }

        render(){

            if(!this.compiled) return;

            // Create a buffer and put a single clipspace rectangle in
            // it (2 triangles)
            var buffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
                -1.0, -1.0,
                1.0, -1.0,
                -1.0,  1.0,
                -1.0,  1.0,
                1.0, -1.0,
                1.0,  1.0]), this.gl.STATIC_DRAW);

            let positionLocation = this.shaders.vertex.a_position.location;

            this.gl.enableVertexAttribArray(positionLocation);
            this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

            this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        }
		
		destroy(): void {
			this.gl.deleteProgram(this.webglProgram);
			this.webglProgram = null;
		}

    }

    //### Handle  Types ###

    export function JS2(v): string{

		let tmp: number;

		if (typeof v === 'string' && !isNaN((tmp = parseFloat(v)))) v = tmp;

        if (typeof v === 'number'){

            if(v % 1 !== 0){
                return v.toString();
            }else{
                return v.toString() + '.0';
            }

        }else if(v instanceof Array){
            let str = '', l = v.length - 1;
            v.forEach(function(e, i){
                str += JS2(e) + (i !== l ? ', ' : '');
            });

            return str;
        }


        return v.toString();
    }

    export class Var {
        str : string = '';
        public name : string;
        declared : boolean = false;
        protected block : Block;
        protected lineNb : number;
        protected type : string;
        static count : number = 0;
        public isConst : boolean = false;

        constructor(type : varType, name? : string){
            this.type = varType[type];
            this.name = name || this.type + '_' + (Var.count++);
        }

        toString() : string {
            return this.str;
        }

        declare(block: Block): void {
			
            this.block = block;
            let dcl = (this.isConst ? 'const ' : '') + this.type + ' ' + this.name;

            if(this.str === ''){
                dcl += ';';
            }else{
                dcl += ' = ' + this.str;
            }

            this.lineNb = this.block.prepend(dcl);

            this.declared = true;

			this.str = this.name;
        }


        val(p? : any){ //Change value
            if(!this.block)
                throwError('Cannot change value, you may not have declared the variable.');
        }

        set(val: string |  Var) : Var { //set value
			if (typeof val === 'string') val = JS2(val);
            this.str = val.toString();
			if (this.declared && this.block)
				this.block.append(this.name + ' = ' + this.str);	
			return this;
        }

		//Logical operators

		//TODO: return booleans instead of strings

        equ(val: string |  Var): Bool { //equal to
			if (typeof val === 'string') val = JS2(val);
            this.str += ' == ' + val;
			return this as Bool;
        }

		neq(val: string |  Var): Bool{ //not equal to
			if (typeof val === 'string') val = JS2(val);
            this.str += ' != ' + val;
			return this as Bool;
		}

		lss(val: string |  Var): Bool { //less than
			if (typeof val === 'string') val = JS2(val);
            this.str += ' < ' + val;
			return this as Bool;
		}

		leq(val: string |  Var): Bool { //less than or equal to
			if (typeof val === 'string') val = JS2(val);
            this.str += ' <= ' + val;
			return this as Bool;
		}

		gtr(val: string | Var): Bool { //greater than
			if (typeof val === 'string') val = JS2(val);
            this.str += ' > ' + val;
			return this as Bool;
		}

		geq(val: string |  Var): Bool { //greater than or equal to
			if (typeof val === 'string') val = JS2(val);
            this.str += ' >= ' + val;
			return this as Bool;
		}

		//Arithmetic

		add(val: string |  Var): Var {
			if (typeof val === 'string') val = JS2(val);
            this.str += ' + ' + val;
			return this;
		}

		sub(val: string |  Var): Var {
			if (typeof val === 'string') val = JS2(val);
            this.str += ' - ' + val;
			return this;
		}

		mul(val: string | Var): Var {
			if (typeof val === 'string') val = JS2(val);
            this.str += ' * ' + val;
			return this;
		}

		div(val: string |  Var): Var {
			if (typeof val === 'string') val = JS2(val);
            this.str += ' / ' + val;
			return this;
		}

    }

	export class Bool extends Var {

		constructor(value: string | boolean) {
			super(varType.bool);

			this.str = value.toString();
		}
	}

    export enum externalType {uniform, varying, attribute}

    class ExternalVar extends Var {

        public location : number;
        public externalType : externalType;
        protected definition : any[];

        constructor(type : varType, external : externalType, name? : string){
            super(type);
            this.externalType = external;
            this.name = name || externalType[external].charAt(0) + '_' + this.name;
        }

        declare(block : Block) : void {
			
            this.declared = true;
            this.block = block;
            let dcl = externalType[this.externalType] + ' ' + this.type + ' ' + this.name;

            if (this.str === ''){
                dcl += ';';
            } else {
                dcl += ' = ' + this.str;
            }

            this.lineNb = this.block.top(dcl);
        }

        link(prog : Prog) : number {


            //Get location
            switch (this.externalType) {
                case externalType.uniform:
                    this.location = <number> prog.gl.getUniformLocation(prog.webglProgram, this.name);
                break;

                case externalType.attribute:
                     this.location = prog.gl.getAttribLocation(prog.webglProgram, this.name);
                break;

            }

            if(this.definition === undefined || this.externalType === externalType.varying) return this.location;

            //define
            let c = externalType[this.externalType];

            if(this.type === 'float'){
                c += '1f';
            }else if(this.type.substring(0, 3) === 'vec'){
                c += this.type.charAt(3) + 'f';
            }else if(this.type.substr(0, 3) === 'mat'){
                c += 'Matrix' + this.type.charAt(3) + 'fv';
            }else{
                console.warn("Type not supported : " + this.type);
            }

            let args = this.definition;
            args.unshift(this.location);

            prog.gl[c].apply(prog.gl, args);

            return this.location;
        }

        toString() : string {
            return this.name;
        }

        val(newVal : string){
            super.val();
            if(newVal.charAt(newVal.length - 1) !== ';')
                newVal += ';';
            this.str = newVal
            this.block.header[this.lineNb] =  (this.isConst ? 'const ' : '') + externalType[this.externalType] +
                 ' ' + varType[this.type] + ' ' + this.name + ' = ' + this.str;
        }

        define(...args : any[]) : void {
            this.definition = args;
        }

    }

    export class Uniform extends ExternalVar {

        constructor(type : varType, name? : string){
            super(type, externalType.uniform, name);
        }
    }

    export class Attribute extends ExternalVar {

        constructor(type : varType, name? : string){
            super(type, externalType.attribute, name);
        }
    }

    export class Varying extends ExternalVar {

        constructor(type : varType, name? : string){
            super(type, externalType.varying, name);
        }
    }

    //OpenGL ES 2.0 doesn't allow array declaration from within a shader
    //workaround inspired by: http://www.john-smith.me/hassles-with-array-access-in-webgl--and-a-couple-of-workarounds

    export class Int8Array extends Uniform {

        public size: number;
        public values: number[];
        public data: ImageData;
        private static arrayCount: number = 0;
		private shader: Shader;

        constructor(parent : Shader, values : number[]){

            super(varType.float);

			if(!!!values || values.length === 0) throwError('Size Exception: Int8Array shall not be empty');

            this.name = 'array_' + (Int8Array.arrayCount++);
            this.size = Math.floor(values.length);
            this.values = values;
			this.shader = parent;

			let len = Math.ceil(this.size / 2),
				data = new Uint32Array(len * 4);

			for (let i = 0; i < 2 * values.length; i += 2){
				let val = values[i / 2];

                data[i] = Math.abs(val);
				data[i + 1] = (val >= 0 ? 255 : 0);
			}

            this.data = createImageData(data, len, 1);

			console.log(data);

			parent.addExternal(this);
        }

        declare() : void { //Automatically called

            let copy = this.type;
            this.type = 'sampler2D';
            super.declare(this.shader);
            this.type = copy;

            //add function

			this.shader.addFunction(glsl.Int8ArrayAt());

        }

        link(prog: Prog): number { //Automatically called

			let tex = prog.gl.createTexture();

			//Load the texture
            prog.gl.bindTexture(prog.gl.TEXTURE_2D, tex);

			// Upload the data into the texture.
            prog.gl.texImage2D(prog.gl.TEXTURE_2D, 0, prog.gl.RGBA, prog.gl.RGBA, prog.gl.UNSIGNED_BYTE, this.data);

            // Set the parameters so we can render any size image.
            prog.gl.texParameteri(prog.gl.TEXTURE_2D, prog.gl.TEXTURE_MIN_FILTER, prog.gl.LINEAR);
            prog.gl.texParameteri(prog.gl.TEXTURE_2D, prog.gl.TEXTURE_WRAP_S, prog.gl.CLAMP_TO_EDGE);
            prog.gl.texParameteri(prog.gl.TEXTURE_2D, prog.gl.TEXTURE_WRAP_T, prog.gl.CLAMP_TO_EDGE);
            prog.gl.texParameteri(prog.gl.TEXTURE_2D, prog.gl.TEXTURE_MAG_FILTER, prog.gl.NEAREST);


            prog.gl.bindTexture(prog.gl.TEXTURE_2D, null); // 'clear' texture status


            this.location = prog.gl.getUniformLocation(prog.webglProgram, this.name) as number;

			prog.gl.activeTexture(prog.gl.TEXTURE0);
			prog.gl.bindTexture(prog.gl.TEXTURE_2D, tex);

			prog.gl.uniform1i(this.location, 0);


            return this.location;
        }

		at(idx : number | string): Float {

			let s = (typeof idx === 'string' ? idx : Math.floor(idx));

			return new Float('at(' + this.toString() + ', ' + s + ', ' + float_to_str(this.size) + ')');
		}

    }
	
	export class Matrix extends Var {
		
		public values: number[];
		public order: number;
		
		constructor(type: varType, values: any[]) {
			super(type);
			
			if (values.length === 0) throwError('Size Exception: a vector cannot be empty');
			
			this.values = values;
		}
		
	}

	export class Vector extends Var {

		public values: number[];
		public static count: number = 0;
		public size: number;
		public x: number;
		private pre: string;

		constructor(type : varType, values : any[]) {
			super(type);

			if (values.length === 0) throwError('Size Exception: a vector cannot be empty');

			this.size = parseInt(varType[type].charAt(3));

			if (isNaN(this.size)) this.size = 1; //It's a float

			if (values.length > this.size)
				throwError('Size Exception: ' + this.size + ' floats expected, got ' + values.length);

			this.pre = this.size === 1 ? 'float' : 'vec' + this.size;

			if (values.length === 1 && typeof values[0] === 'string')
				this.str = this.pre + '(' + values[0] + ')';

			this.str = this.pre + '(' + JS2(values) + ')';
			this.values = values;

			Vector.count++;

		}

        val(...newVec : any[]){
            super.val();
            this.str = this.pre + '(' + JS2(newVec) + ');';
            this.block.header[this.lineNb] = (this.isConst ? 'const ' : '') + this.pre + ' ' + this.name + ' = ' + this.str;
        }

		at(idx : number | string) : Float {

			let s = (typeof idx === 'string' ? idx : float_to_str(idx));

			return new Float(this.name + '[' + s + ']');
		}

	}

    export class Vec2 extends Vector {

		y: number;

        constructor(values: any[], n?: number) {
			super(varType['vec' + ((n ? n : 0) + 2)], values);

			this.y = values[1];
        }

    }

    export class Vec3 extends Vec2 {

		z: number;

        constructor(values: any[], vec4?: boolean) {
            super(values, 1 + ((vec4 !== undefined && vec4) ? 1 : 0));

			this.z = values[2];
        }

		toVec2(): Vec2 {
			return new Vec2(this.values.splice(0, 2));
		}

    }

    export class Vec4 extends Vec3 {

		w: number;

        constructor(values : any[]){
            super(values, true);

			this.w = values[3];
        }

		toVec3(): Vec3 {
			return new Vec3(this.values.splice(0, 3));
		}

    }

    export class Float extends Vector {

        constructor(n : number | string){
            super(varType.float, [n]);
        }

    }

    export class mat2 extends Var {

        values : any[];
        static count: number = 0;
		order = 2;

        constructor(...values : any[]){
            super(varType.mat2);
            this.values = values;
            this.str = 'mat2(' + JS2(values) + ')';
            mat2.count++;
        }

        val(...newVec : any[]){
            super.val();
            this.block.header[this.lineNb] = (this.isConst ? 'const ' : '') +
                'mat2 ' + this.name + ' = mat2(' + JS2(newVec) + ');';
        }

		at(coord: Vec2): Float {
			return new Float(this.name + '[' + coord + '][' +  + ']');
		}


    }

    export class mat3 extends Var {

        values : any[];
        static count: number = 0;
		order = 3;

        constructor(...values : any[]){
            super(varType.mat3);
            this.values = values;
            this.str = 'mat3(' + JS2(values) + ')';
            mat3.count++;
        }

        val(...newVec : any[]){
            super.val();
            this.block.header[this.lineNb] = (this.isConst ? 'const ' : '') +
                'mat3 ' + this.name + ' = mat3(' + JS2(newVec) + ');';
        }

    }

    export class mat4 extends Var {

        values : any[];
        static count : number = 0;

        constructor(...values : any[]){
            super(varType.mat4);
            this.values = values;
            this.str = 'mat4(' + JS2(values) + ')';
            mat4.count++;
        }

        val(...newVec : any[]){
            super.val();
            this.block.header[this.lineNb] = (this.isConst ? 'const ' : '') +
                'mat4 ' + this.name + ' = mat4(' + JS2(newVec) + ');';
        }

    }
    
    //WCV
    
    let float_to_str = (f : Float | number) : string => {
        if(f instanceof Float){
            return f.toString();
        }else{
            return JS2(f);
        }
    };
    
    
    let toCanvas = (canvas : string | HTMLCanvasElement) : HTMLCanvasElement => {
        let cnv : HTMLCanvasElement;
		
        if(canvas){
            if(typeof canvas === 'string'){
                cnv = <HTMLCanvasElement> document.querySelector(canvas);
            }else{
                cnv = canvas;
            }
        }else{
            cnv = document.createElement('canvas');   
        }
        	
        return cnv;
    };
    
    let toTexture = (t : number | Texture, textures : Texture[]) : Texture => {
        if(typeof t === 'number'){
            return textures[t];
        }else if(t){
            return t;
        }
        
        return textures[0];
    };

    //End UTILS
	
	let GLSLInt8ArrayAt = () : Func => {
	
		let at = new Func('at', varType.int, 'sampler2D array, int index, float length');
		at.append(
			'float idx = 2.0 * mod(float(index), length);' +
			'vec4 v = texture2D(array, vec2(0.5 * idx / length, 0.0));' +
			'if(mod(idx, 4.0) == 0.0){return int(v.r * sign(v.g - 0.5) * 255.0);}' + 
			'else{return int(v.b * sign(v.a - 0.5) * 255.0);}'
		);
		
		at.precedence = 2;
		
		return at;
		
	};
    
    let GLSLConvolution2 = function(kernel: Int8Array) : Func { //FIXME: Use for(int i = 0; i < MAX){if(..) break;} ??
 
		let h = Math.floor(Math.sqrt(kernel.size) / 2);
		
        let conv = new Func('convolution_' + Math.sqrt(kernel.size), varType.vec4, 'sampler2D tex, sampler2D kernel');
		
		conv.append(
			'vec4 sum = vec4(0.0)',
			'int n = 0',
			'for(int i = ' + (-h) + '; i <= ' + h + '; i++){',
			'for(int j = ' + (-h) + '; j <= ' + h + '; j++){',
					'sum += texture2D(tex, v_texCoord + u_delta * vec2(j, i)) * float(at(kernel, n, ' + float_to_str(kernel.size) + ')) / 255.0',
					'n++',
				'}',
			'}',
			'return texture2D(u_image_0, vec2(0.0))'
		);
        
        conv.precedence = 1;
        
        return conv;
    };
	
	let conv_count = 0;
    
	let GLSLConvolution = function(kernel : number[]) : Func { //FIXME: Use for(int i = 0; i < MAX){if(..) break;} ??
 
		let sq = Math.sqrt(kernel.length),
			half = Math.floor(sq / 2);	
		
        let conv = new Func('convolution_' + (conv_count++), varType.vec4, 'sampler2D tex');
        
		conv.append('vec4 sum = vec4(0.0)');
		
		let c = kernel.length - 1;
		
		for (let i = -half; i <= half; i++) {
			for (let j = -half; j <= half; j++){
				conv.append('sum += texture2D(tex, v_texCoord + u_delta * vec2(' + j + ', ' + i + ')) * '
					+ float_to_str(kernel[c--]));
			}
		}
		
		conv.append('return sum;');
        
        conv.precedence = 1;
        
        return conv;
    };
	
    let GLSLGrey = function() : Func {
        let grey = new Func('grey', varType.float, 'vec3 color');
        grey.append('return dot(color, vec3(0.2126, 0.7152, 0.0722))');   
        
        return grey;
    };
    
    enum THRESH {BINARY, BINARY_INV, TRUNC, TO_ZERO, TO_ZERO_INV};
    
    let GLSLThreshold = function(type? : THRESH) : Func {

        if(!type) type = THRESH.BINARY;

        let func = new Func('thresh_' + THRESH[type].toLowerCase(), varType.vec3, 'vec3 color, float thresh, float max');
		
        switch(type){
            case THRESH.BINARY:   
                func.append('return step(thresh, color) * vec3(max)');
                break;
            case THRESH.BINARY_INV:
                func.append('return vec3(max) - step(thresh, color)');
                break;
            case THRESH.TRUNC:
                func.append('vec3 s = step(thresh, color) * thresh');
                func.append('return step(color, vec3(1.0) - s)');
                break;
        }
            
        return func;
    };
	
	enum SOBEL {ABS = 1, SQRT};
	
    let GLSLSobel = function() : Func[] {
        
        let sobel = new Func('sobel', varType.float, 'sampler2D tex, int method'),
                sobelX = [-1, -2, -1, 0, 0, 0, 1, 2, 1],
                sobelY = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
		
		let convX = glsl.convolution(sobelX),
			convY = glsl.convolution(sobelY);	
        
        sobel.append(
                'float Gx = length(' + convX.name + '(tex));' +
                'float Gy = length(' + convY.name + '(tex));' + 
                'if(method == 1){return abs(Gx) + abs(Gy);}else{return sqrt(pow(Gx, 2.0) + pow(Gy, 2.0));}'
        );
        
        return [sobel, convX, convY];
    }
    
    let GLSLPosterize = function(){
        
        let posterize = new Func('posterize', varType.vec3, 'vec3 color, float gamma, float numColors');
            posterize.append(
                'color = pow(color, vec3(gamma));' + 
                'color *= numColors;' + 
                'color = floor(color);' + 
                'color /= numColors;' + 
                'return pow(color, vec3(1.0 / gamma));'
            );
            
        return posterize;
    };
    
    let GLSLPixelate = function() : Func {
        
        let pixelate = new Func('pixelate', varType.vec4, 'sampler2D tex, float size');
        
            pixelate.append( 
              'return texture2D(tex, size * u_delta * floor(v_texCoord / d))'  
            );
            
			
        return pixelate;
    }
	
	let GLSLNegative = function() : Func {
		let neg = new Func('negative', varType.vec3, 'vec3 color');
		
		neg.append(
			'return ' + float(1).sub('color')
		);
		
		return neg;
	};
	
    
    export class Context {
        
        public canvas : HTMLCanvasElement;
        private textures : Texture[] = [];
        public fs : FragmentShader;
        public vs : VertexShader;
        private loadedCount : number = 0;
        private onTexturesLoadedCallbacks : Callback[] = [];
        private texturesLoaded : boolean = false;
        private onRenderedCallbacks : Callback[] = [];
        public program : Prog;
        private rendering : boolean = false;
        public fragColor: Vec4; //Fragment shader gl_fragColor
		public position: Vec4;
		private nbEffects: number; //For ping-pong mechanism
        
        constructor(canvas : HTMLCanvasElement | string, textures? : Texture[] | Texture, shaders? : Shaders){
            
            //Init
            this.canvas = toCanvas(canvas);
            
            if(!shaders){
                this.fs = new FragmentShader();
                this.fs.setPrecision(varType.float, precisionType.mediump);
                
                //Add (1.0 / resolution) uniform
                let res = new Uniform(varType.vec2, 'u_delta');
                    res.define(1 / this.canvas.width, 1 / this.canvas.height);
                    this.fs.addExternal(res);
                
                this.vs = new VertexShader();
                
            }else{
                this.vs = shaders.vertex;
                this.fs = shaders.fragment;   
            }
            
            this.fragColor = this.fs.fragColor;
			this.position = this.vs.position;
            
            if(textures && textures instanceof Array){
                for(let tex of textures) this.addTexture(tex);
            }else if(textures instanceof Texture){
                this.addTexture(textures);
            }
                
            
        }
        
        addTexture(tex : Texture) : boolean {
            
            for(let t of this.textures){
                if(t.name === tex.name){
                    return false;
                }
            }
            
            this.textures.push(tex);
            
            tex.onload(this.textureLoaded, this);
            
            return true;
        }

        private textureLoaded(){
            
            this.loadedCount++;
            if(this.loadedCount === this.textures.length){
                this.texturesLoaded = true;
                
                for(let cb of this.onTexturesLoadedCallbacks) cb.callback.call(cb.thisArg);
                
                this.onTexturesLoadedCallbacks = [];
            }
        }
        
        toImage() : Promise<HTMLImageElement> {

			if (!this.rendering) this.render();
			
			return new Promise<HTMLImageElement>((resolve, reject) => {
				this.onRendered(function(){
					let img = new Image();
						img.src = this.canvas.toDataURL();
					
					resolve(img);
				}, this);
			});
            
            /* Other way
 
            this.readPixels(function(pixels : Uint8Array) {
                callback.call(thisArg || this, new Texture(createImageData(pixels, this.width(), this.height())));
            }, this);
            
            */
            
        }
		
        find_contours(callback : Function, thisArg? : any){
 		
            this.readPixels(function(pxls : Uint8Array) { 
            
                let len = pxls.length,
                    ctn = new Uint16Array(pxls.length / 4),
                    count = 0;
                    
                for(let i = 0; i < len; i += 4){
                    if(pxls[i] === 255){
                        ctn[count++] = i / 4;
                    }
                }
                
                ctn = ctn.subarray(0, count + 1);
                
                callback.call(thisArg || this, ctn);
                
            }, this);
        }
        
        readPixels(callback : Function, thisArg? : any) : void{
            
            if(!this.rendering) this.render();
            
            this.onRendered(function(){
                let pixels = new Uint8Array(this.canvas.width * this.canvas.height * 4);
                let gl = this.program.gl;
                gl.readPixels(0, 0, this.canvas.width, this.canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                
                callback.call(thisArg || this, pixels);
                 
            });
        }
        
        /*### FILTERS ###*/

        sobel(texture : number | Texture, method? : SOBEL) : Float {
            
            if(!method) method = SOBEL.SQRT;
            
            let tex = toTexture(texture, this.textures);
		
            this.addTexture(tex);

            this.onTexturesLoaded(() => {         
                this.fs.addFunctions(glsl.sobel());
            }, this);
            
            let sobel = new Float('sobel(' + tex + ', ' + method + ')');
                sobel.declare(this.fs.main);
            
            return sobel;
        }
        
        grey(color? : Vec3) : Float{
         
            this.fs.addFunction(glsl.grey());
            
            let grey = new Float('grey(' + (color || this.fs.fragColor) + '.rgb)');
                grey.declare(this.fs.main);
            
            return grey;
        }
        
        
        posterize(color? : Vec3, gamma? : number, numColors? : number) : Vec3 {
            
            gamma = gamma || 0.6;
            numColors = numColors || 8;
            
            numColors -= numColors % 1; //Make sure it's an integer
            
            this.fs.addFunction(glsl.posterize());
            
            let prz = new Vec3(['posterize(' + (color || this.fs.fragColor) + '.rgb, ' + float_to_str(gamma) + 
                ', ' + float_to_str(numColors) + ')']);
                
            prz.declare(this.fs.main);
                
            return prz;
            
        }
        
        pixelate(texture : number | Texture, size? : number) : Vec4 {
            
            let tex = toTexture(texture, this.textures);
            
            size = size || 5;
            
            this.fs.addFunction(glsl.pixelate());
            
            let pxt = new Vec4(['pixelate(' + tex + ', ' + float_to_str(size) + ')']);
                pxt.declare(this.fs.main);
            
            return pxt;
        }
        
        convolution(texture : number | Texture, kernel : number[]) : Vec4 {
            
		    let sq = Math.sqrt(kernel.length);
			
			if (sq % 1 !== 0) {
				throwError('Kernel sould be a square matrix (length = perfect square nb)');
			}
			
			if (sq % 2 !== 1 || sq === 1) {
				throwError('Kernel should have an odd number of rows and cols > 1');
			}
			
            let tex = toTexture(texture, this.textures);
			
			let conv = glsl.convolution(kernel);
            
            this.onTexturesLoaded(function(){         
                this.fs.addFunction(conv);
            }, this);
            
            let c = new Vec4([conv.name + '(' + tex + ')']);
            	c.declare(this.fs.main);
            
            return c;
            
        }
        
        threshold(color : Vec3, thresh : Float | number, max? : Float | number, type? : THRESH) : Vec3{

            max = max || 1;
            type = type || THRESH.BINARY;
            
            let fname = 'thresh_' + THRESH[type].toLowerCase();
                
            if(!this.fs.hasFunc(fname)){
                let func = glsl.threshold(type);
                this.fs.addChild(func);   
            }
            
                
            let tr = new Vec3([fname + '(' +  color + '.rgb, ' + float_to_str(thresh) + ', ' +
                    float_to_str(max) + ')']);
                    
                    tr.declare(this.fs.main);
                    
            return tr;
        }
        
        /*### END FILTERS ###*/
        
        setSize(width : number, height: number){
            this.canvas.width = width;
            this.canvas.height = height;
        }
        
        onTexturesLoaded(callback : Function, thisArg? : any) : void{ //Ran when all textures are loaded
            
            if(this.texturesLoaded || this.textures.length === 0) callback.call(thisArg || this)
            else this.onTexturesLoadedCallbacks.push({callback: callback, thisArg: thisArg});
        }
        
        onRendered(callback : Function, thisArg? : any) : void {
            
            
            if(this.program) callback.call(thisArg || this);
            else this.onRenderedCallbacks.push({callback: callback, thisArg: thisArg});
            
        }
        
        width() : number{
            return this.canvas.width;
        }
        
        height() : number{
            return this.canvas.height;
        }
        
        render() : void {
            
            if(this.program || this.rendering) return;
            
            this.rendering = true;
            
            this.onTexturesLoaded(function() { 
				
                this.program = new Prog(this.canvas, {vertex: this.vs, fragment: this.fs});
                
                for(let tex of this.textures)
                    this.program.addTexture(tex);
                    
				let t = new Date().getTime();
				
                this.program.compile();
                this.program.render();
                
                this.rendering = false;
				
				console.log((new Date().getTime() - t) + 'ms');
                
                //Run the onRenderer callbacks
                
                for(let c of this.onRenderedCallbacks)
                    c.callback.call(c.thisArg);
                    
                this.onRenderedCallbacks = [];
                  
            }, this);
            
        }
		
		destroy(): void {
			this.fs.destroy(this.program.gl);
			this.vs.destroy(this.program.gl);
			this.program.gl.deleteProgram(this.program.webglProgram);
			this.program.webglProgram = null;
			this.program = undefined;
		}
        
    }
    
    let glsl = {
        convolution: GLSLConvolution,
		convolution2: GLSLConvolution2,
        grey: GLSLGrey,
        threshold: GLSLThreshold,
        sobel: GLSLSobel,
        posterize : GLSLPosterize,
        pixelate: GLSLPixelate,
		Int8ArrayAt: GLSLInt8ArrayAt,
		negative: GLSLNegative
    }
    
    //MATRIX FUNCTIONS

    export module math {
        
        //Vector utils

        export let vec_mul = (u: number[], v: number[] | number) : number[] => { //Component-wise vector multiplication
            
            let l = u.length, w = [];
            
            if (typeof v === 'number') {
                for (let i = 0; i < l; i++) w.push(u[i] * v);
                
                return w;
            }
            
            for (let i = 0; i < l; i++) w.push(u[i] * v[i]);
                
            return w;
        };
         
        export let vec_div = (u: number[], v: number[] | number) : number[] => { //Component-wise vector division
            
            let l = u.length, w = [];
            
            if (typeof v === 'number') {
                for (let i = 0; i < l; i++) w.push(u[i] / v);
                
                return w;
            }
            
            for (let i = 0; i < l; i++) w.push(u[i] / v[i]);
                
            return w;
        };

        export let conv_mult = (u: number[], v: number[]) => {
            
            let conv = [];
            
            for (let c of u) conv.push(vec_mul(u, c));
            
            return conv;
        }

        interface VectorStats { avg: number, std: number };

        let stats = (vector: number[]) : VectorStats => {
            let avg = 0;
            
            for (let v of vector) avg += v;
            avg /= vector.length;
            
            let s = 0;
            
            for (let v of vector)
                s += Math.abs(v - avg);
            
            return {avg: avg, std: s};
        };

        //ConvolutionKernel utils
        
        export interface SeparatedConvolutionKernel { vertical: number[], horizontal: number[] }

        export class ConvolutionKernel {
            
            public rows: number[][] = [];
            public cols: number[][] = [];
            public separation: SeparatedConvolutionKernel;
            public squared: boolean;
            public length: number;
            
            constructor(kernel: number[][] | SeparatedConvolutionKernel) {

                if (Array.isArray(kernel)) {

                    let l = kernel[0].length, i = 0;
                    
                    for (let row of kernel) {
                    
                        this.rows.push(row);

                        for (let j = 0; j < l; j++) {
                            if (!this.cols[j]) this.cols[j] = [];
                            this.cols[j][i] = row[j];
                        }
                        
                        i++;
                    }

                    this.squared = this.rows.length === this.cols.length;
                    this.length = this.rows.length * this.cols.length;
                
                } else {
                    this.separation = kernel;
                    this.squared = kernel.vertical.length === kernel.horizontal.length;
                    this.length = kernel.vertical.length * kernel.horizontal.length;
                }
                        
            }
            
            isSeparable(eps = 0.01): boolean { //Returns true iff rank(this) === 1

                for (let r of this.rows)
                    for (let i = 0; i < this.rows.length; i++) {
                        if (stats(vec_div(r, this.rows[i])).std > eps) return false;
                    }
                
                return true;
                
            }
            
            separate(eps = 0.01): SeparatedConvolutionKernel {
                
                if (!this.isSeparable(eps)) return null;
                
                let v = this.rows[0],
                    h = [1];
                    
                for (let i = 1; i < this.rows.length; i++) {
                    let avg = stats(vec_div(v, this.rows[i])).avg;
                    h.push(isFinite(avg) ? avg : 0);
                }
                
                return {vertical: h, horizontal: v};
            }
            
        }
    }
    
}
