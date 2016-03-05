/*
WebCV: Blazingly fast computer vision in the browser

The MIT License (MIT)
Copyright (c) 2016 Nathan Soufflet <nathsou.fr@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path="../definitions/es6-promise.d.ts" />
var wcv;
(function (wcv) {
    (function (varType) {
        varType[varType["void"] = 0] = "void";
        varType[varType["float"] = 1] = "float";
        varType[varType["string"] = 2] = "string";
        varType[varType["vec2"] = 3] = "vec2";
        varType[varType["vec3"] = 4] = "vec3";
        varType[varType["vec4"] = 5] = "vec4";
        varType[varType["sampler2D"] = 6] = "sampler2D";
        varType[varType["bool"] = 7] = "bool";
        varType[varType["int"] = 8] = "int";
        varType[varType["mat2"] = 9] = "mat2";
        varType[varType["mat3"] = 10] = "mat3";
        varType[varType["mat4"] = 11] = "mat4";
    })(wcv.varType || (wcv.varType = {}));
    var varType = wcv.varType;
    ;
    (function (shaderType) {
        shaderType[shaderType["fragment"] = 35632] = "fragment";
        shaderType[shaderType["vertex"] = 35633] = "vertex";
    })(wcv.shaderType || (wcv.shaderType = {}));
    var shaderType = wcv.shaderType;
    ;
    wcv.throwError = function (msg, throwIt) {
        console.warn('WCV : ' + msg);
        if (throwIt)
            throw msg;
        //alert(msg);
    };
    var textureCount = 0;
    wcv.vectorType = function (u) {
        var type;
        if (u.size === 1) {
            type = 'float';
        }
        else {
            type = 'vec' + u.size;
        }
        return type;
    };
    var imageToImageData = function (img) {
        var cnv = document.createElement('canvas'), ctx = cnv.getContext('2d');
        cnv.width = img.width;
        cnv.height = img.height;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, cnv.width, cnv.height);
    };
    var createImageData = function (data, width, height) {
        if (!(data instanceof Uint8ClampedArray)) {
            data = new Uint8ClampedArray(data);
        }
        if (ImageData) {
            return new ImageData(data, width, height);
        }
        else {
            var cnv = document.createElement('canvas'), ctx = cnv.getContext('2d');
            var imd = ctx.createImageData(width, height);
            for (var i = 0; i < data.length; i++)
                imd.data[i] = data[i];
            return imd;
        }
    };
    var Texture = (function () {
        function Texture(img) {
            this.callbacks = [];
            this.name = 'u_image_' + (textureCount++);
            if (img instanceof HTMLImageElement) {
                this.img = img;
                this.onload(function () {
                    //this.data = imageToImageData(img);
                    this.width = img.width;
                    this.height = img.height;
                }, this);
                var that = this;
                this.img.onload = function () {
                    for (var _i = 0, _a = that.callbacks; _i < _a.length; _i++) {
                        var cb = _a[_i];
                        cb.callback.call(cb.thisArg);
                    }
                    that.callbacks = [];
                };
            }
            else {
                this.data = img;
                this.width = img.width;
                this.height = img.height;
            }
        }
        Texture.prototype.loaded = function () {
            if (this.img)
                return this.img.complete;
            return true;
        };
        Texture.prototype.toString = function () {
            return this.name;
        };
        Texture.prototype.onload = function (callback, thisArg) {
            if (this.loaded())
                callback.call(thisArg || this);
            else
                this.callbacks.push({ callback: callback, thisArg: thisArg || this });
        };
        Texture.prototype.at = function (coord) {
            return new Vec4(['texture2D(' + this.name + ', ' + coord + ')']);
        };
        Texture.prototype.destroy = function (gl) {
            gl.deleteTexture(this.id);
            this.id = null;
        };
        return Texture;
    })();
    wcv.Texture = Texture;
    var Block = (function () {
        function Block(parent) {
            this.children = [];
            this.funcs = [];
            this.header = [];
            this.footer = [];
            this.lines = [];
            this.parent = parent;
        }
        Block.prototype.append = function () {
            var lines = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                lines[_i - 0] = arguments[_i];
            }
            for (var _a = 0; _a < lines.length; _a++) {
                var line = lines[_a];
                var last = line.charAt(line.length - 1);
                if (last !== ';' && last !== '}' && last !== '{')
                    line += ';';
                this.lines.push(line);
            }
            return this.lines.length - 1;
        };
        Block.prototype.top = function (line) {
            var last = line.charAt(line.length - 1);
            if (last !== ';' && last !== '}')
                line += ';';
            this.header.unshift(line);
            return 0;
        };
        Block.prototype.prepend = function (line) {
            var last = line.charAt(line.length - 1);
            if (last !== ';' && last !== '}')
                line += ';';
            this.header.push(line);
            return this.header.length - 1;
        };
        Block.prototype.hasFunc = function (name) {
            for (var _i = 0, _a = this.funcs; _i < _a.length; _i++) {
                var c = _a[_i];
                if (c.name === name)
                    return true;
            }
            return false;
        };
        Block.prototype.addChild = function (child) {
            if (child instanceof Func) {
                this.funcs.push(child);
            }
            else {
                this.children.push(child);
            }
        };
        Block.prototype.addChildren = function () {
            var children = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                children[_i - 0] = arguments[_i];
            }
            for (var _a = 0; _a < children.length; _a++) {
                var child = children[_a];
                this.addChild(child);
            }
        };
        Block.prototype.getCode = function () {
            var code = '';
            var that = this;
            for (var _i = 0, _a = this.header; _i < _a.length; _i++) {
                var line = _a[_i];
                code += line + '\n';
            }
            for (var _b = 0, _c = this.lines; _b < _c.length; _b++) {
                var line = _c[_b];
                code += line + '\n';
            }
            for (var _d = 0, _e = this.children; _d < _e.length; _d++) {
                var child = _e[_d];
                code += child.getCode() + '\n';
            }
            //Sort funcs by precedence
            this.funcs.sort(function (a, b) {
                return b.precedence - a.precedence;
            });
            for (var _f = 0, _g = this.funcs; _f < _g.length; _f++) {
                var func = _g[_f];
                code += func.getCode() + '\n';
            }
            for (var _h = 0, _j = this.footer; _h < _j.length; _h++) {
                var line = _j[_h];
                code += line + '\n';
            }
            return code;
        };
        return Block;
    })();
    var Func = (function (_super) {
        __extends(Func, _super);
        function Func(name, returnType, params, parent) {
            _super.call(this, parent || null);
            this.params = '';
            this.precedence = 0;
            this.name = name;
            this.returnType = returnType;
            if (params)
                this.params = params;
        }
        Func.prototype.getCode = function () {
            return varType[this.returnType] + ' ' + this.name + '(' + this.params + '){' + _super.prototype.getCode.call(this) + '}';
        };
        return Func;
    })(Block);
    wcv.Func = Func;
    var Shader = (function (_super) {
        __extends(Shader, _super);
        function Shader(type, code) {
            _super.call(this, null);
            this.externals = [];
            this.type = type;
            if (code)
                this.lines = code;
            //Create the main function
            this.main = new Func('main', varType.void, '', this);
        }
        Shader.prototype.addFunction = function (func) {
            if (!this.hasFunc(func.name))
                this.addChild(func);
        };
        Shader.prototype.addFunctions = function (funcs) {
            for (var _i = 0; _i < funcs.length; _i++) {
                var func = funcs[_i];
                this.addFunction(func);
            }
        };
        Shader.prototype.compile = function (gl) {
            this.webglShader = gl.createShader(this.type);
            gl.shaderSource(this.webglShader, this.getCode());
            gl.compileShader(this.webglShader);
            if (!gl.getShaderParameter(this.webglShader, gl.COMPILE_STATUS)) {
                wcv.throwError('Shader compilation exception');
                console.log(gl.getShaderInfoLog(this.webglShader));
            }
            return this.webglShader;
        };
        Shader.prototype.destroy = function (gl) {
            gl.deleteShader(this.webglShader);
            this.webglShader = null;
        };
        //Get a function by its name
        Shader.prototype.f = function (name) {
            for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
                var f = _a[_i];
                if (f instanceof Func) {
                    if (f.name === name) {
                        return f;
                    }
                }
            }
            return undefined;
        };
        Shader.prototype.declareExternals = function (prog) {
            for (var _i = 0, _a = this.externals; _i < _a.length; _i++) {
                var v = _a[_i];
                v.declare(this);
            }
        };
        Shader.prototype.addExternal = function (ext) {
            if (ext.declared)
                return;
            this.externals.push(ext);
            ext.declared = true;
        };
        Shader.prototype.linkExternals = function (prog) {
            for (var _i = 0, _a = this.externals; _i < _a.length; _i++) {
                var v = _a[_i];
                v.link(prog);
            }
        };
        Shader.prototype.getCode = function () {
            return _super.prototype.getCode.call(this) + this.main.getCode() + '\n';
        };
        return Shader;
    })(Block);
    var VertexShader = (function (_super) {
        __extends(VertexShader, _super);
        function VertexShader(code) {
            if (code === void 0) { code = []; }
            _super.call(this, shaderType.vertex, code);
            this.positionSet = false;
            this.a_position = new Attribute(varType.vec2, 'a_position');
            this.a_position.declare(this);
            this.position = new Vec4(['vec4(' + this.a_position + ', 0.0, 1.0)']);
            this.position.name = 'position';
            this.position.declare(this.main);
        }
        VertexShader.prototype.getCode = function () {
            if (!this.positionSet) {
                this.main.append('gl_Position = ' + this.position);
                this.positionSet = true;
            }
            return _super.prototype.getCode.call(this);
        };
        return VertexShader;
    })(Shader);
    wcv.VertexShader = VertexShader;
    (function (precisionType) {
        precisionType[precisionType["highp"] = 0] = "highp";
        precisionType[precisionType["mediump"] = 1] = "mediump";
        precisionType[precisionType["lowp"] = 2] = "lowp";
    })(wcv.precisionType || (wcv.precisionType = {}));
    var precisionType = wcv.precisionType;
    ;
    var FragmentShader = (function (_super) {
        __extends(FragmentShader, _super);
        function FragmentShader(code) {
            if (code === void 0) { code = []; }
            _super.call(this, shaderType.fragment, code);
            this.colorSet = false;
            this.hasTexture = false;
            this.precision = [];
            this.fragColor = new Vec4([1]);
            this.fragColor.name = 'fragColor';
            this.fragColor.declare(this.main);
            this.texCoord = new Varying(varType.vec2, 'v_texCoord');
            this.addExternal(this.texCoord);
            this.main.footer.push('gl_FragColor = ' + this.fragColor + ';');
        }
        FragmentShader.prototype.setPrecision = function (type, precision) {
            this.precision.push('precision ' + precisionType[precision] + ' ' + varType[type] + ';\n');
        };
        FragmentShader.prototype.getCode = function () {
            if (!this.colorSet) {
                //this.main.append('gl_fragColor = ' + this.fragColor);
                this.colorSet = true;
            }
            return this.precision.join('') + _super.prototype.getCode.call(this);
        };
        return FragmentShader;
    })(Shader);
    wcv.FragmentShader = FragmentShader;
    var Prog = (function () {
        function Prog(canvas, shaders) {
            this.compiled = false;
            this.textures = [];
            if (typeof (canvas) === 'string') {
                var cnv = document.getElementById(canvas);
                if (cnv instanceof HTMLCanvasElement)
                    this.canvas = cnv;
                else
                    wcv.throwError("HTMLCanvasElement '#" + cnv + "' not found");
            }
            else if (canvas instanceof HTMLCanvasElement) {
                this.canvas = canvas;
            }
            else {
                wcv.throwError("'canvas' argument must me an instance of HTMLCanvasElement or a string");
            }
            //Init the WebglRenderingContex
            this.gl = (this.canvas.getContext('webgl', { preserveDrawingBuffer: true })
                || this.canvas.getContext('webgl-experiment', { preserveDrawingBuffer: true }));
            //Init the Shaders
            this.shaders = shaders;
        }
        Prog.prototype.addTexture = function (tex) {
            this.textures.push(tex);
            var texture = new Uniform(varType.sampler2D, tex.name);
            this.shaders.fragment.addExternal(texture);
            if (!this.shaders.fragment.hasTexture) {
                //Allow texCoord communication between the vertex and the fragment shaders
                var v_texCoord = new Varying(varType.vec2, 'v_texCoord');
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
        };
        Prog.prototype.compile = function () {
            this.shaders.vertex.declareExternals(this);
            this.shaders.fragment.declareExternals(this);
            console.log(this.shaders.vertex.getCode());
            console.log(this.shaders.fragment.getCode());
            this.webglProgram = this.gl.createProgram();
            this.gl.attachShader(this.webglProgram, this.shaders.vertex.compile(this.gl));
            this.gl.attachShader(this.webglProgram, this.shaders.fragment.compile(this.gl));
            this.gl.linkProgram(this.webglProgram);
            if (!this.gl.getProgramParameter(this.webglProgram, this.gl.LINK_STATUS)) {
                wcv.throwError("Unable to initialize the shader program.");
            }
            this.gl.useProgram(this.webglProgram);
            //Link external variables (uniforms, attributes..)
            this.shaders.vertex.linkExternals(this);
            this.shaders.fragment.linkExternals(this);
            this.compiled = true;
        };
        Prog.prototype.render = function () {
            if (!this.compiled)
                return;
            // Create a buffer and put a single clipspace rectangle in
            // it (2 triangles)
            var buffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
                -1.0, -1.0,
                1.0, -1.0,
                -1.0, 1.0,
                -1.0, 1.0,
                1.0, -1.0,
                1.0, 1.0]), this.gl.STATIC_DRAW);
            var positionLocation = this.shaders.vertex.a_position.location;
            this.gl.enableVertexAttribArray(positionLocation);
            this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
            this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        };
        Prog.prototype.destroy = function () {
            this.gl.deleteProgram(this.webglProgram);
            this.webglProgram = null;
        };
        return Prog;
    })();
    wcv.Prog = Prog;
    //### Handle  Types ###
    function JS2(v) {
        var tmp;
        if (typeof v === 'string' && !isNaN((tmp = parseFloat(v))))
            v = tmp;
        if (typeof v === 'number') {
            if (v % 1 !== 0) {
                return v.toString();
            }
            else {
                return v.toString() + '.0';
            }
        }
        else if (v instanceof Array) {
            var str = '', l = v.length - 1;
            v.forEach(function (e, i) {
                str += JS2(e) + (i !== l ? ', ' : '');
            });
            return str;
        }
        return v.toString();
    }
    wcv.JS2 = JS2;
    var Var = (function () {
        function Var(type, name) {
            this.str = '';
            this.declared = false;
            this.isConst = false;
            this.type = varType[type];
            this.name = name || this.type + '_' + (Var.count++);
        }
        Var.prototype.toString = function () {
            return this.str;
        };
        Var.prototype.declare = function (block) {
            this.block = block;
            var dcl = (this.isConst ? 'const ' : '') + this.type + ' ' + this.name;
            if (this.str === '') {
                dcl += ';';
            }
            else {
                dcl += ' = ' + this.str;
            }
            this.lineNb = this.block.prepend(dcl);
            this.declared = true;
            this.str = this.name;
        };
        Var.prototype.val = function (p) {
            if (!this.block)
                wcv.throwError('Cannot change value, you may not have declared the variable.');
        };
        Var.prototype.set = function (val) {
            if (typeof val === 'string')
                val = JS2(val);
            this.str = val.toString();
            if (this.declared && this.block)
                this.block.append(this.name + ' = ' + this.str);
            return this;
        };
        //Logical operators
        //TODO: return booleans instead of strings
        Var.prototype.equ = function (val) {
            if (typeof val === 'string')
                val = JS2(val);
            this.str += ' == ' + val;
            return this;
        };
        Var.prototype.neq = function (val) {
            if (typeof val === 'string')
                val = JS2(val);
            this.str += ' != ' + val;
            return this;
        };
        Var.prototype.lss = function (val) {
            if (typeof val === 'string')
                val = JS2(val);
            this.str += ' < ' + val;
            return this;
        };
        Var.prototype.leq = function (val) {
            if (typeof val === 'string')
                val = JS2(val);
            this.str += ' <= ' + val;
            return this;
        };
        Var.prototype.gtr = function (val) {
            if (typeof val === 'string')
                val = JS2(val);
            this.str += ' > ' + val;
            return this;
        };
        Var.prototype.geq = function (val) {
            if (typeof val === 'string')
                val = JS2(val);
            this.str += ' >= ' + val;
            return this;
        };
        //Arithmetic
        Var.prototype.add = function (val) {
            if (typeof val === 'string')
                val = JS2(val);
            this.str += ' + ' + val;
            return this;
        };
        Var.prototype.sub = function (val) {
            if (typeof val === 'string')
                val = JS2(val);
            this.str += ' - ' + val;
            return this;
        };
        Var.prototype.mul = function (val) {
            if (typeof val === 'string')
                val = JS2(val);
            this.str += ' * ' + val;
            return this;
        };
        Var.prototype.div = function (val) {
            if (typeof val === 'string')
                val = JS2(val);
            this.str += ' / ' + val;
            return this;
        };
        Var.count = 0;
        return Var;
    })();
    wcv.Var = Var;
    var Bool = (function (_super) {
        __extends(Bool, _super);
        function Bool(value) {
            _super.call(this, varType.bool);
            this.str = value.toString();
        }
        return Bool;
    })(Var);
    wcv.Bool = Bool;
    (function (externalType) {
        externalType[externalType["uniform"] = 0] = "uniform";
        externalType[externalType["varying"] = 1] = "varying";
        externalType[externalType["attribute"] = 2] = "attribute";
    })(wcv.externalType || (wcv.externalType = {}));
    var externalType = wcv.externalType;
    var ExternalVar = (function (_super) {
        __extends(ExternalVar, _super);
        function ExternalVar(type, external, name) {
            _super.call(this, type);
            this.externalType = external;
            this.name = name || externalType[external].charAt(0) + '_' + this.name;
        }
        ExternalVar.prototype.declare = function (block) {
            this.declared = true;
            this.block = block;
            var dcl = externalType[this.externalType] + ' ' + this.type + ' ' + this.name;
            if (this.str === '') {
                dcl += ';';
            }
            else {
                dcl += ' = ' + this.str;
            }
            this.lineNb = this.block.top(dcl);
        };
        ExternalVar.prototype.link = function (prog) {
            //Get location
            switch (this.externalType) {
                case externalType.uniform:
                    this.location = prog.gl.getUniformLocation(prog.webglProgram, this.name);
                    break;
                case externalType.attribute:
                    this.location = prog.gl.getAttribLocation(prog.webglProgram, this.name);
                    break;
            }
            if (this.definition === undefined || this.externalType === externalType.varying)
                return this.location;
            //define
            var c = externalType[this.externalType];
            if (this.type === 'float') {
                c += '1f';
            }
            else if (this.type.substring(0, 3) === 'vec') {
                c += this.type.charAt(3) + 'f';
            }
            else if (this.type.substr(0, 3) === 'mat') {
                c += 'Matrix' + this.type.charAt(3) + 'fv';
            }
            else {
                console.warn("Type not supported : " + this.type);
            }
            var args = this.definition;
            args.unshift(this.location);
            prog.gl[c].apply(prog.gl, args);
            return this.location;
        };
        ExternalVar.prototype.toString = function () {
            return this.name;
        };
        ExternalVar.prototype.val = function (newVal) {
            _super.prototype.val.call(this);
            if (newVal.charAt(newVal.length - 1) !== ';')
                newVal += ';';
            this.str = newVal;
            this.block.header[this.lineNb] = (this.isConst ? 'const ' : '') + externalType[this.externalType] +
                ' ' + varType[this.type] + ' ' + this.name + ' = ' + this.str;
        };
        ExternalVar.prototype.define = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            this.definition = args;
        };
        return ExternalVar;
    })(Var);
    var Uniform = (function (_super) {
        __extends(Uniform, _super);
        function Uniform(type, name) {
            _super.call(this, type, externalType.uniform, name);
        }
        return Uniform;
    })(ExternalVar);
    wcv.Uniform = Uniform;
    var Attribute = (function (_super) {
        __extends(Attribute, _super);
        function Attribute(type, name) {
            _super.call(this, type, externalType.attribute, name);
        }
        return Attribute;
    })(ExternalVar);
    wcv.Attribute = Attribute;
    var Varying = (function (_super) {
        __extends(Varying, _super);
        function Varying(type, name) {
            _super.call(this, type, externalType.varying, name);
        }
        return Varying;
    })(ExternalVar);
    wcv.Varying = Varying;
    //OpenGL ES 2.0 doesn't allow array declaration from within a shader
    //workaround inspired by: http://www.john-smith.me/hassles-with-array-access-in-webgl--and-a-couple-of-workarounds
    var Int8Array = (function (_super) {
        __extends(Int8Array, _super);
        function Int8Array(parent, values) {
            _super.call(this, varType.float);
            if (!!!values || values.length === 0)
                wcv.throwError('Size Exception: Int8Array shall not be empty');
            this.name = 'array_' + (Int8Array.arrayCount++);
            this.size = Math.floor(values.length);
            this.values = values;
            this.shader = parent;
            var len = Math.ceil(this.size / 2), data = new Uint32Array(len * 4);
            for (var i = 0; i < 2 * values.length; i += 2) {
                var val = values[i / 2];
                data[i] = Math.abs(val);
                data[i + 1] = (val >= 0 ? 255 : 0);
            }
            this.data = createImageData(data, len, 1);
            console.log(data);
            parent.addExternal(this);
        }
        Int8Array.prototype.declare = function () {
            var copy = this.type;
            this.type = 'sampler2D';
            _super.prototype.declare.call(this, this.shader);
            this.type = copy;
            //add function
            this.shader.addFunction(glsl.Int8ArrayAt());
        };
        Int8Array.prototype.link = function (prog) {
            var tex = prog.gl.createTexture();
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
            this.location = prog.gl.getUniformLocation(prog.webglProgram, this.name);
            prog.gl.activeTexture(prog.gl.TEXTURE0);
            prog.gl.bindTexture(prog.gl.TEXTURE_2D, tex);
            prog.gl.uniform1i(this.location, 0);
            return this.location;
        };
        Int8Array.prototype.at = function (idx) {
            var s = (typeof idx === 'string' ? idx : Math.floor(idx));
            return new Float('at(' + this.toString() + ', ' + s + ', ' + float_to_str(this.size) + ')');
        };
        Int8Array.arrayCount = 0;
        return Int8Array;
    })(Uniform);
    wcv.Int8Array = Int8Array;
    var Matrix = (function (_super) {
        __extends(Matrix, _super);
        function Matrix(type, values) {
            _super.call(this, type);
            if (values.length === 0)
                wcv.throwError('Size Exception: a vector cannot be empty');
            this.values = values;
        }
        return Matrix;
    })(Var);
    wcv.Matrix = Matrix;
    var Vector = (function (_super) {
        __extends(Vector, _super);
        function Vector(type, values) {
            _super.call(this, type);
            if (values.length === 0)
                wcv.throwError('Size Exception: a vector cannot be empty');
            this.size = parseInt(varType[type].charAt(3));
            if (isNaN(this.size))
                this.size = 1; //It's a float
            if (values.length > this.size)
                wcv.throwError('Size Exception: ' + this.size + ' floats expected, got ' + values.length);
            this.pre = this.size === 1 ? 'float' : 'vec' + this.size;
            if (values.length === 1 && typeof values[0] === 'string')
                this.str = this.pre + '(' + values[0] + ')';
            this.str = this.pre + '(' + JS2(values) + ')';
            this.values = values;
            Vector.count++;
        }
        Vector.prototype.val = function () {
            var newVec = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                newVec[_i - 0] = arguments[_i];
            }
            _super.prototype.val.call(this);
            this.str = this.pre + '(' + JS2(newVec) + ');';
            this.block.header[this.lineNb] = (this.isConst ? 'const ' : '') + this.pre + ' ' + this.name + ' = ' + this.str;
        };
        Vector.prototype.at = function (idx) {
            var s = (typeof idx === 'string' ? idx : float_to_str(idx));
            return new Float(this.name + '[' + s + ']');
        };
        Vector.count = 0;
        return Vector;
    })(Var);
    wcv.Vector = Vector;
    var Vec2 = (function (_super) {
        __extends(Vec2, _super);
        function Vec2(values, n) {
            _super.call(this, varType['vec' + ((n ? n : 0) + 2)], values);
            this.y = values[1];
        }
        return Vec2;
    })(Vector);
    wcv.Vec2 = Vec2;
    var Vec3 = (function (_super) {
        __extends(Vec3, _super);
        function Vec3(values, vec4) {
            _super.call(this, values, 1 + ((vec4 !== undefined && vec4) ? 1 : 0));
            this.z = values[2];
        }
        Vec3.prototype.toVec2 = function () {
            return new Vec2(this.values.splice(0, 2));
        };
        return Vec3;
    })(Vec2);
    wcv.Vec3 = Vec3;
    var Vec4 = (function (_super) {
        __extends(Vec4, _super);
        function Vec4(values) {
            _super.call(this, values, true);
            this.w = values[3];
        }
        Vec4.prototype.toVec3 = function () {
            return new Vec3(this.values.splice(0, 3));
        };
        return Vec4;
    })(Vec3);
    wcv.Vec4 = Vec4;
    var Float = (function (_super) {
        __extends(Float, _super);
        function Float(n) {
            _super.call(this, varType.float, [n]);
        }
        return Float;
    })(Vector);
    wcv.Float = Float;
    var mat2 = (function (_super) {
        __extends(mat2, _super);
        function mat2() {
            var values = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                values[_i - 0] = arguments[_i];
            }
            _super.call(this, varType.mat2);
            this.order = 2;
            this.values = values;
            this.str = 'mat2(' + JS2(values) + ')';
            mat2.count++;
        }
        mat2.prototype.val = function () {
            var newVec = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                newVec[_i - 0] = arguments[_i];
            }
            _super.prototype.val.call(this);
            this.block.header[this.lineNb] = (this.isConst ? 'const ' : '') +
                'mat2 ' + this.name + ' = mat2(' + JS2(newVec) + ');';
        };
        mat2.prototype.at = function (coord) {
            return new Float(this.name + '[' + coord + '][' + +']');
        };
        mat2.count = 0;
        return mat2;
    })(Var);
    wcv.mat2 = mat2;
    var mat3 = (function (_super) {
        __extends(mat3, _super);
        function mat3() {
            var values = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                values[_i - 0] = arguments[_i];
            }
            _super.call(this, varType.mat3);
            this.order = 3;
            this.values = values;
            this.str = 'mat3(' + JS2(values) + ')';
            mat3.count++;
        }
        mat3.prototype.val = function () {
            var newVec = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                newVec[_i - 0] = arguments[_i];
            }
            _super.prototype.val.call(this);
            this.block.header[this.lineNb] = (this.isConst ? 'const ' : '') +
                'mat3 ' + this.name + ' = mat3(' + JS2(newVec) + ');';
        };
        mat3.count = 0;
        return mat3;
    })(Var);
    wcv.mat3 = mat3;
    var mat4 = (function (_super) {
        __extends(mat4, _super);
        function mat4() {
            var values = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                values[_i - 0] = arguments[_i];
            }
            _super.call(this, varType.mat4);
            this.values = values;
            this.str = 'mat4(' + JS2(values) + ')';
            mat4.count++;
        }
        mat4.prototype.val = function () {
            var newVec = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                newVec[_i - 0] = arguments[_i];
            }
            _super.prototype.val.call(this);
            this.block.header[this.lineNb] = (this.isConst ? 'const ' : '') +
                'mat4 ' + this.name + ' = mat4(' + JS2(newVec) + ');';
        };
        mat4.count = 0;
        return mat4;
    })(Var);
    wcv.mat4 = mat4;
    //WCV
    var float_to_str = function (f) {
        if (f instanceof Float) {
            return f.toString();
        }
        else {
            return JS2(f);
        }
    };
    var toCanvas = function (canvas) {
        var cnv;
        if (canvas) {
            if (typeof canvas === 'string') {
                cnv = document.querySelector(canvas);
            }
            else {
                cnv = canvas;
            }
        }
        else {
            cnv = document.createElement('canvas');
        }
        return cnv;
    };
    var toTexture = function (t, textures) {
        if (typeof t === 'number') {
            return textures[t];
        }
        else if (t) {
            return t;
        }
        return textures[0];
    };
    //End UTILS
    var GLSLInt8ArrayAt = function () {
        var at = new Func('at', varType.int, 'sampler2D array, int index, float length');
        at.append('float idx = 2.0 * mod(float(index), length);' +
            'vec4 v = texture2D(array, vec2(0.5 * idx / length, 0.0));' +
            'if(mod(idx, 4.0) == 0.0){return int(v.r * sign(v.g - 0.5) * 255.0);}' +
            'else{return int(v.b * sign(v.a - 0.5) * 255.0);}');
        at.precedence = 2;
        return at;
    };
    var GLSLConvolution2 = function (kernel) {
        var h = Math.floor(Math.sqrt(kernel.size) / 2);
        var conv = new Func('convolution_' + Math.sqrt(kernel.size), varType.vec4, 'sampler2D tex, sampler2D kernel');
        conv.append('vec4 sum = vec4(0.0)', 'int n = 0', 'for(int i = ' + (-h) + '; i <= ' + h + '; i++){', 'for(int j = ' + (-h) + '; j <= ' + h + '; j++){', 'sum += texture2D(tex, v_texCoord + u_delta * vec2(j, i)) * float(at(kernel, n, ' + float_to_str(kernel.size) + ')) / 255.0', 'n++', '}', '}', 'return texture2D(u_image_0, vec2(0.0))');
        conv.precedence = 1;
        return conv;
    };
    var conv_count = 0;
    var GLSLConvolution = function (kernel) {
        var sq = Math.sqrt(kernel.length), half = Math.floor(sq / 2);
        var conv = new Func('convolution_' + (conv_count++), varType.vec4, 'sampler2D tex');
        conv.append('vec4 sum = vec4(0.0)');
        var c = kernel.length - 1;
        for (var i = -half; i <= half; i++) {
            for (var j = -half; j <= half; j++) {
                conv.append('sum += texture2D(tex, v_texCoord + u_delta * vec2(' + j + ', ' + i + ')) * '
                    + float_to_str(kernel[c--]));
            }
        }
        conv.append('return sum;');
        conv.precedence = 1;
        return conv;
    };
    var GLSLGrey = function () {
        var grey = new Func('grey', varType.float, 'vec3 color');
        grey.append('return dot(color, vec3(0.2126, 0.7152, 0.0722))');
        return grey;
    };
    var THRESH;
    (function (THRESH) {
        THRESH[THRESH["BINARY"] = 0] = "BINARY";
        THRESH[THRESH["BINARY_INV"] = 1] = "BINARY_INV";
        THRESH[THRESH["TRUNC"] = 2] = "TRUNC";
        THRESH[THRESH["TO_ZERO"] = 3] = "TO_ZERO";
        THRESH[THRESH["TO_ZERO_INV"] = 4] = "TO_ZERO_INV";
    })(THRESH || (THRESH = {}));
    ;
    var GLSLThreshold = function (type) {
        if (!type)
            type = THRESH.BINARY;
        var func = new Func('thresh_' + THRESH[type].toLowerCase(), varType.vec3, 'vec3 color, float thresh, float max');
        switch (type) {
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
    var SOBEL;
    (function (SOBEL) {
        SOBEL[SOBEL["ABS"] = 1] = "ABS";
        SOBEL[SOBEL["SQRT"] = 2] = "SQRT";
    })(SOBEL || (SOBEL = {}));
    ;
    var GLSLSobel = function () {
        var sobel = new Func('sobel', varType.float, 'sampler2D tex, int method'), sobelX = [-1, -2, -1, 0, 0, 0, 1, 2, 1], sobelY = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        var convX = glsl.convolution(sobelX), convY = glsl.convolution(sobelY);
        sobel.append('float Gx = length(' + convX.name + '(tex));' +
            'float Gy = length(' + convY.name + '(tex));' +
            'if(method == 1){return abs(Gx) + abs(Gy);}else{return sqrt(pow(Gx, 2.0) + pow(Gy, 2.0));}');
        return [sobel, convX, convY];
    };
    var GLSLPosterize = function () {
        var posterize = new Func('posterize', varType.vec3, 'vec3 color, float gamma, float numColors');
        posterize.append('color = pow(color, vec3(gamma));' +
            'color *= numColors;' +
            'color = floor(color);' +
            'color /= numColors;' +
            'return pow(color, vec3(1.0 / gamma));');
        return posterize;
    };
    var GLSLPixelate = function () {
        var pixelate = new Func('pixelate', varType.vec4, 'sampler2D tex, float size');
        pixelate.append('return texture2D(tex, size * u_delta * floor(v_texCoord / d))');
        return pixelate;
    };
    var GLSLNegative = function () {
        var neg = new Func('negative', varType.vec3, 'vec3 color');
        neg.append('return ' + float(1).sub('color'));
        return neg;
    };
    var Context = (function () {
        function Context(canvas, textures, shaders) {
            this.textures = [];
            this.loadedCount = 0;
            this.onTexturesLoadedCallbacks = [];
            this.texturesLoaded = false;
            this.onRenderedCallbacks = [];
            this.rendering = false;
            //Init
            this.canvas = toCanvas(canvas);
            if (!shaders) {
                this.fs = new FragmentShader();
                this.fs.setPrecision(varType.float, precisionType.mediump);
                //Add (1.0 / resolution) uniform
                var res = new Uniform(varType.vec2, 'u_delta');
                res.define(1 / this.canvas.width, 1 / this.canvas.height);
                this.fs.addExternal(res);
                this.vs = new VertexShader();
            }
            else {
                this.vs = shaders.vertex;
                this.fs = shaders.fragment;
            }
            this.fragColor = this.fs.fragColor;
            this.position = this.vs.position;
            if (textures && textures instanceof Array) {
                for (var _i = 0; _i < textures.length; _i++) {
                    var tex = textures[_i];
                    this.addTexture(tex);
                }
            }
            else if (textures instanceof Texture) {
                this.addTexture(textures);
            }
        }
        Context.prototype.addTexture = function (tex) {
            for (var _i = 0, _a = this.textures; _i < _a.length; _i++) {
                var t = _a[_i];
                if (t.name === tex.name) {
                    return false;
                }
            }
            this.textures.push(tex);
            tex.onload(this.textureLoaded, this);
            return true;
        };
        Context.prototype.textureLoaded = function () {
            this.loadedCount++;
            if (this.loadedCount === this.textures.length) {
                this.texturesLoaded = true;
                for (var _i = 0, _a = this.onTexturesLoadedCallbacks; _i < _a.length; _i++) {
                    var cb = _a[_i];
                    cb.callback.call(cb.thisArg);
                }
                this.onTexturesLoadedCallbacks = [];
            }
        };
        Context.prototype.toImage = function () {
            var _this = this;
            if (!this.rendering)
                this.render();
            return new Promise(function (resolve, reject) {
                _this.onRendered(function () {
                    var img = new Image();
                    img.src = this.canvas.toDataURL();
                    resolve(img);
                }, _this);
            });
            /* Other way
 
            this.readPixels(function(pixels : Uint8Array) {
                callback.call(thisArg || this, new Texture(createImageData(pixels, this.width(), this.height())));
            }, this);
            
            */
        };
        Context.prototype.find_contours = function (callback, thisArg) {
            this.readPixels(function (pxls) {
                var len = pxls.length, ctn = new Uint16Array(pxls.length / 4), count = 0;
                for (var i = 0; i < len; i += 4) {
                    if (pxls[i] === 255) {
                        ctn[count++] = i / 4;
                    }
                }
                ctn = ctn.subarray(0, count + 1);
                callback.call(thisArg || this, ctn);
            }, this);
        };
        Context.prototype.readPixels = function (callback, thisArg) {
            if (!this.rendering)
                this.render();
            this.onRendered(function () {
                var pixels = new Uint8Array(this.canvas.width * this.canvas.height * 4);
                var gl = this.program.gl;
                gl.readPixels(0, 0, this.canvas.width, this.canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                callback.call(thisArg || this, pixels);
            });
        };
        /*### FILTERS ###*/
        Context.prototype.sobel = function (texture, method) {
            var _this = this;
            if (!method)
                method = SOBEL.SQRT;
            var tex = toTexture(texture, this.textures);
            this.addTexture(tex);
            this.onTexturesLoaded(function () {
                _this.fs.addFunctions(glsl.sobel());
            }, this);
            var sobel = new Float('sobel(' + tex + ', ' + method + ')');
            sobel.declare(this.fs.main);
            return sobel;
        };
        Context.prototype.grey = function (color) {
            this.fs.addFunction(glsl.grey());
            var grey = new Float('grey(' + (color || this.fs.fragColor) + '.rgb)');
            grey.declare(this.fs.main);
            return grey;
        };
        Context.prototype.posterize = function (color, gamma, numColors) {
            gamma = gamma || 0.6;
            numColors = numColors || 8;
            numColors -= numColors % 1; //Make sure it's an integer
            this.fs.addFunction(glsl.posterize());
            var prz = new Vec3(['posterize(' + (color || this.fs.fragColor) + '.rgb, ' + float_to_str(gamma) +
                    ', ' + float_to_str(numColors) + ')']);
            prz.declare(this.fs.main);
            return prz;
        };
        Context.prototype.pixelate = function (texture, size) {
            var tex = toTexture(texture, this.textures);
            size = size || 5;
            this.fs.addFunction(glsl.pixelate());
            var pxt = new Vec4(['pixelate(' + tex + ', ' + float_to_str(size) + ')']);
            pxt.declare(this.fs.main);
            return pxt;
        };
        Context.prototype.convolution = function (texture, kernel) {
            var sq = Math.sqrt(kernel.length);
            if (sq % 1 !== 0) {
                wcv.throwError('Kernel sould be a square matrix (length = perfect square nb)');
            }
            if (sq % 2 !== 1 || sq === 1) {
                wcv.throwError('Kernel should have an odd number of rows and cols > 1');
            }
            var tex = toTexture(texture, this.textures);
            var conv = glsl.convolution(kernel);
            this.onTexturesLoaded(function () {
                this.fs.addFunction(conv);
            }, this);
            var c = new Vec4([conv.name + '(' + tex + ')']);
            c.declare(this.fs.main);
            return c;
        };
        Context.prototype.threshold = function (color, thresh, max, type) {
            max = max || 1;
            type = type || THRESH.BINARY;
            var fname = 'thresh_' + THRESH[type].toLowerCase();
            if (!this.fs.hasFunc(fname)) {
                var func = glsl.threshold(type);
                this.fs.addChild(func);
            }
            var tr = new Vec3([fname + '(' + color + '.rgb, ' + float_to_str(thresh) + ', ' +
                    float_to_str(max) + ')']);
            tr.declare(this.fs.main);
            return tr;
        };
        /*### END FILTERS ###*/
        Context.prototype.setSize = function (width, height) {
            this.canvas.width = width;
            this.canvas.height = height;
        };
        Context.prototype.onTexturesLoaded = function (callback, thisArg) {
            if (this.texturesLoaded || this.textures.length === 0)
                callback.call(thisArg || this);
            else
                this.onTexturesLoadedCallbacks.push({ callback: callback, thisArg: thisArg });
        };
        Context.prototype.onRendered = function (callback, thisArg) {
            if (this.program)
                callback.call(thisArg || this);
            else
                this.onRenderedCallbacks.push({ callback: callback, thisArg: thisArg });
        };
        Context.prototype.width = function () {
            return this.canvas.width;
        };
        Context.prototype.height = function () {
            return this.canvas.height;
        };
        Context.prototype.render = function () {
            if (this.program || this.rendering)
                return;
            this.rendering = true;
            this.onTexturesLoaded(function () {
                this.program = new Prog(this.canvas, { vertex: this.vs, fragment: this.fs });
                for (var _i = 0, _a = this.textures; _i < _a.length; _i++) {
                    var tex = _a[_i];
                    this.program.addTexture(tex);
                }
                var t = new Date().getTime();
                this.program.compile();
                this.program.render();
                this.rendering = false;
                console.log((new Date().getTime() - t) + 'ms');
                //Run the onRenderer callbacks
                for (var _b = 0, _c = this.onRenderedCallbacks; _b < _c.length; _b++) {
                    var c = _c[_b];
                    c.callback.call(c.thisArg);
                }
                this.onRenderedCallbacks = [];
            }, this);
        };
        Context.prototype.destroy = function () {
            this.fs.destroy(this.program.gl);
            this.vs.destroy(this.program.gl);
            this.program.gl.deleteProgram(this.program.webglProgram);
            this.program.webglProgram = null;
            this.program = undefined;
        };
        return Context;
    })();
    wcv.Context = Context;
    var glsl = {
        convolution: GLSLConvolution,
        convolution2: GLSLConvolution2,
        grey: GLSLGrey,
        threshold: GLSLThreshold,
        sobel: GLSLSobel,
        posterize: GLSLPosterize,
        pixelate: GLSLPixelate,
        Int8ArrayAt: GLSLInt8ArrayAt,
        negative: GLSLNegative
    };
    //MATRIX FUNCTIONS
    var math;
    (function (math) {
        //Vector utils
        math.vec_mul = function (u, v) {
            var l = u.length, w = [];
            if (typeof v === 'number') {
                for (var i = 0; i < l; i++)
                    w.push(u[i] * v);
                return w;
            }
            for (var i = 0; i < l; i++)
                w.push(u[i] * v[i]);
            return w;
        };
        math.vec_div = function (u, v) {
            var l = u.length, w = [];
            if (typeof v === 'number') {
                for (var i = 0; i < l; i++)
                    w.push(u[i] / v);
                return w;
            }
            for (var i = 0; i < l; i++)
                w.push(u[i] / v[i]);
            return w;
        };
        math.conv_mult = function (u, v) {
            var conv = [];
            for (var _i = 0; _i < u.length; _i++) {
                var c = u[_i];
                conv.push(math.vec_mul(u, c));
            }
            return conv;
        };
        ;
        var stats = function (vector) {
            var avg = 0;
            for (var _i = 0; _i < vector.length; _i++) {
                var v = vector[_i];
                avg += v;
            }
            avg /= vector.length;
            var s = 0;
            for (var _a = 0; _a < vector.length; _a++) {
                var v = vector[_a];
                s += Math.abs(v - avg);
            }
            return { avg: avg, std: s };
        };
        var ConvolutionKernel = (function () {
            function ConvolutionKernel(kernel) {
                this.rows = [];
                this.cols = [];
                if (Array.isArray(kernel)) {
                    var l = kernel[0].length, i = 0;
                    for (var _i = 0; _i < kernel.length; _i++) {
                        var row = kernel[_i];
                        this.rows.push(row);
                        for (var j = 0; j < l; j++) {
                            if (!this.cols[j])
                                this.cols[j] = [];
                            this.cols[j][i] = row[j];
                        }
                        i++;
                    }
                    this.squared = this.rows.length === this.cols.length;
                    this.length = this.rows.length * this.cols.length;
                }
                else {
                    this.separation = kernel;
                    this.squared = kernel.vertical.length === kernel.horizontal.length;
                    this.length = kernel.vertical.length * kernel.horizontal.length;
                }
            }
            ConvolutionKernel.prototype.isSeparable = function (eps) {
                if (eps === void 0) { eps = 0.01; }
                for (var _i = 0, _a = this.rows; _i < _a.length; _i++) {
                    var r = _a[_i];
                    for (var i = 0; i < this.rows.length; i++) {
                        if (stats(math.vec_div(r, this.rows[i])).std > eps)
                            return false;
                    }
                }
                return true;
            };
            ConvolutionKernel.prototype.separate = function (eps) {
                if (eps === void 0) { eps = 0.01; }
                if (!this.isSeparable(eps))
                    return null;
                var v = this.rows[0], h = [1];
                for (var i = 1; i < this.rows.length; i++) {
                    var avg = stats(math.vec_div(v, this.rows[i])).avg;
                    h.push(isFinite(avg) ? avg : 0);
                }
                return { vertical: h, horizontal: v };
            };
            return ConvolutionKernel;
        })();
        math.ConvolutionKernel = ConvolutionKernel;
    })(math = wcv.math || (wcv.math = {}));
})(wcv || (wcv = {}));
