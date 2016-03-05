//### GLSL ES 2.0 BUILT-IN TYPES ###
var _this = this;
var float = function (n) {
    return new wcv.Float(n);
};
var vec2 = function () {
    var values = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        values[_i - 0] = arguments[_i];
    }
    return new wcv.Vec2(values);
};
var vec3 = function () {
    var values = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        values[_i - 0] = arguments[_i];
    }
    return new wcv.Vec3(values);
};
var vec4 = function () {
    var values = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        values[_i - 0] = arguments[_i];
    }
    return new wcv.Vec4(values);
};
var mat2 = function () {
    var values = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        values[_i - 0] = arguments[_i];
    }
    return new wcv.mat2(values);
};
var mat3 = function () {
    var values = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        values[_i - 0] = arguments[_i];
    }
    return new wcv.mat3(values);
};
var mat4 = function () {
    var values = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        values[_i - 0] = arguments[_i];
    }
    return new wcv.mat4(values);
};
var bool = function (val) {
    return new wcv.Bool(val);
};
//### STATEMENTS ###
var _if = function (condition, then, otherwise, appendTo) {
    var th = then.toString();
    var last = th.charAt(th.length - 1);
    if (last !== ';' && last !== '}' && last !== '\n')
        then += ';';
    if (otherwise) {
        var oth = otherwise.toString();
        last = oth.charAt(oth.length - 1);
        if (last !== ';' && last !== '}' && last !== '\n')
            otherwise += ';';
    }
    var r = 'if(' + condition + '){' + then + '}' + (otherwise ? 'else{' + otherwise + '}' : '');
    if (appendTo)
        appendTo.append(r);
    return r;
};
//### GLSL ES 2.0 BUILT-IN FUNCTIONS ### See http://www.shaderific.com/glsl-functions
//Util function to check wether two vector are of same dimension
var checkDimension = function () {
    var vectors = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        vectors[_i - 0] = arguments[_i];
    }
    var len = vectors[0].size;
    for (var _a = 0; _a < vectors.length; _a++) {
        var v = vectors[_a];
        if (v.size !== len)
            wcv.throwError('parameters must be vectors of same dimension or floats');
    }
};
//ANGLE & TRIGONOMETRY FUNCTIONS
var radians = function (u) {
    return _this[wcv.vectorType(u)]('radians(' + u + ')');
};
var degrees = function (u) {
    return _this[wcv.vectorType(u)]('degrees(' + u + ')');
};
var sin = function (u) {
    return _this[wcv.vectorType(u)]('sin(' + u + ')');
};
var cos = function (u) {
    return _this[wcv.vectorType(u)]('cos(' + u + ')');
};
var tan = function (u) {
    return _this[wcv.vectorType(u)]('tan(' + u + ')');
};
var asin = function (u) {
    return _this[wcv.vectorType(u)]('asin(' + u + ')');
};
var acos = function (u) {
    return _this[wcv.vectorType(u)]('acos(' + u + ')');
};
//two parameters -> equivalent to atan2 in other languages
var atan = function (u, v) {
    if (v)
        checkDimension(u, v);
    return _this[wcv.vectorType(u)]('atan(' + u + (v ? ', ' + v : '') + ')');
};
//sugar for atan2
var atan2 = function (u, v) {
    return atan(u, v);
};
//EXPONENTIAL FUNCTIONS
var pow = function (u, v) {
    checkDimension(u, v);
    return _this[wcv.vectorType(u)]('pow(' + u + ', ' + v + ')');
};
var exp = function (u) {
    return _this[wcv.vectorType(u)]('exp(' + u + ')');
};
var log = function (u) {
    return _this[wcv.vectorType(u)]('log(' + u + ')');
};
var exp2 = function (u) {
    return _this[wcv.vectorType(u)]('exp2(' + u + ')');
};
var log2 = function (u) {
    return _this[wcv.vectorType(u)]('log2(' + u + ')');
};
var sqrt = function (u) {
    return _this[wcv.vectorType(u)]('sqrt(' + u + ')');
};
var inversesqrt = function (u) {
    return _this[wcv.vectorType(u)]('inversesqrt(' + u + ')');
};
//COMMON FUNCTIONS
var abs = function (u) {
    return _this[wcv.vectorType(u)]('abs(' + u + ')');
};
var sign = function (u) {
    return _this[wcv.vectorType(u)]('sign(' + u + ')');
};
var floor = function (u) {
    return _this[wcv.vectorType(u)]('floor(' + u + ')');
};
var ceil = function (u) {
    return _this[wcv.vectorType(u)]('ceil(' + u + ')');
};
var fract = function (u) {
    return _this[wcv.vectorType(u)]('fract(' + u + ')');
};
var mod = function (u, v) {
    if (v.size > 1)
        checkDimension(u, v);
    return _this[wcv.vectorType(u)]('mod(' + u + ', ' + v + ')');
};
var min = function (u, v) {
    if (v.size > 1)
        checkDimension(u, v);
    return _this[wcv.vectorType(u)]('min(' + u + ', ' + v + ')');
};
var max = function (u, v) {
    if (v.size > 1)
        checkDimension(u, v);
    return _this[wcv.vectorType(u)]('max(' + u + ', ' + v + ')');
};
var clamp = function (u, v, w) {
    if (v.size > 1 || w.size > 1)
        checkDimension(u, v, w);
    return _this[wcv.vectorType(u)]('clamp(' + u + ', ' + v + ', ' + w + ')');
};
var mix = function (u, v, w) {
    checkDimension(u, v);
    if (w.size > 1)
        checkDimension(u, v, w);
    return _this[wcv.vectorType(u)]('mix(' + u + ', ' + v + ', ' + w + ')');
};
var step = function (u, v) {
    if (u.size > 1)
        checkDimension(u, v);
    return _this[wcv.vectorType(u)]('step(' + u + ', ' + v + ')');
};
var smoothstep = function (u, v, w) {
    checkDimension(u, v);
    if (u.size > 1 || v.size > 1)
        checkDimension(u, v, w);
    return _this[wcv.vectorType(u)]('smoothstep(' + u + ', ' + v + ', ' + w + ')');
};
//GEOMETRIC FUNCTIONS
var len = function (u) {
    return float('length(' + u + ')');
};
var distance = function (u, v) {
    checkDimension(u, v);
    return float('distance(' + u + ', ' + v + ')');
};
var dot = function (u, v) {
    checkDimension(u, v);
    return float('dot(' + u + ', ' + v + ')');
};
var cross = function (u, v) {
    return vec3('cross(' + u + ', ' + v + ')');
};
var normalize = function (u) {
    return _this[wcv.vectorType(u)]('normalize(' + u + ')');
};
var faceforward = function (N, I, Nref) {
    checkDimension(N, I, Nref);
    return _this[wcv.vectorType(N)]('faceforward(' + N + ', ' + I + ', ' + Nref + ')');
};
var reflect = function (I, N) {
    checkDimension(I, N);
    return _this[wcv.vectorType(I)]('reflect(' + I + ', ' + N + ')');
};
var refract = function (I, N, eta) {
    checkDimension(I, N);
    return _this[wcv.vectorType(I)]('refract(' + I + ', ' + N + ', ' + eta + ')');
};
