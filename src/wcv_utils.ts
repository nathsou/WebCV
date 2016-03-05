
//### GLSL ES 2.0 BUILT-IN TYPES ###

let float = (n : number | string) : wcv.Float => {
	return new wcv.Float(n);
};

let vec2 = (...values : any[]) : wcv.Vec2 => {
	return new wcv.Vec2(values);
};

let vec3 = (...values : any[]) : wcv.Vec3 => {
	return new wcv.Vec3(values);
};

let vec4 = (...values : any[]) : wcv.Vec4 => {
	return new wcv.Vec4(values);
};

let mat2 = (...values : any[]) : wcv.mat2 => {
	return new wcv.mat2(values);
};

let mat3 = (...values : any[]) : wcv.mat3 => {
	return new wcv.mat3(values);
};

let mat4 = (...values : any[]) : wcv.mat4 => {
	return new wcv.mat4(values);
};

let bool = (val: string | boolean) => {
	return new wcv.Bool(val);
};

//### STATEMENTS ###

let _if =  (condition : wcv.Bool | string, then : string | wcv.Var, otherwise? : string | wcv.Var, appendTo?  : wcv.Func) : string => {
	
	let th = then.toString();	
	
	let last = th.charAt(th.length - 1);
	
	if (last !== ';' && last !== '}' && last !== '\n') then += ';';
	
	if (otherwise) {
		
		let oth = otherwise.toString();
		
		last = oth.charAt(oth.length - 1);
		
		if (last !== ';' && last !== '}' && last !== '\n') otherwise += ';';
	}
	
	let r = 'if(' + condition + '){' + then + '}' + (otherwise ? 'else{' + otherwise + '}' : '');
	
	if (appendTo) appendTo.append(r);	
	
	return r;
}

//### GLSL ES 2.0 BUILT-IN FUNCTIONS ### See http://www.shaderific.com/glsl-functions

//Util function to check wether two vector are of same dimension

let checkDimension = (...vectors: wcv.Vector[]) => {
	
	let len = vectors[0].size;
	
	for (let v of vectors)
		if (v.size !== len)	
			wcv.throwError('parameters must be vectors of same dimension or floats');		
};

//ANGLE & TRIGONOMETRY FUNCTIONS

let radians = (u: wcv.Vector) : wcv.Vector => {
	return this[wcv.vectorType(u)]('radians(' + u + ')');
}

let degrees = (u: wcv.Vector) : wcv.Vector => {
	return this[wcv.vectorType(u)]('degrees(' + u + ')');
}

let sin = (u: wcv.Vector) : wcv.Vector => {
	return this[wcv.vectorType(u)]('sin(' + u + ')');
}

let cos = (u: wcv.Vector) : wcv.Vector => {
	return this[wcv.vectorType(u)]('cos(' + u + ')');
}

let tan = (u: wcv.Vector) : wcv.Vector => {
	return this[wcv.vectorType(u)]('tan(' + u + ')');
}

let asin = (u: wcv.Vector) : wcv.Vector => {
	return this[wcv.vectorType(u)]('asin(' + u + ')');
}

let acos = (u: wcv.Vector) : wcv.Vector => {
	return this[wcv.vectorType(u)]('acos(' + u + ')');
}


//two parameters -> equivalent to atan2 in other languages
let atan = (u: wcv.Vector, v?: wcv.Vector): wcv.Vector => {
	if(v) checkDimension(u, v);
	return this[wcv.vectorType(u)]('atan(' + u + (v ? ', ' + v : '') + ')');
}

//sugar for atan2
let atan2 = (u: wcv.Vector, v: wcv.Vector) : wcv.Vector => {
	return atan(u, v);
}

//EXPONENTIAL FUNCTIONS

let pow = (u: wcv.Vector, v: wcv.Vector): wcv.Vector => {
	checkDimension(u, v);
	return this[wcv.vectorType(u)]('pow(' + u + ', ' + v + ')');
}

let exp = (u: wcv.Vector): wcv.Vector => {
	return this[wcv.vectorType(u)]('exp(' + u + ')');
} 

let log = (u: wcv.Vector): wcv.Vector => {
	return this[wcv.vectorType(u)]('log(' + u + ')');
} 

let exp2 = (u: wcv.Vector): wcv.Vector => {
	return this[wcv.vectorType(u)]('exp2(' + u + ')');
} 

let log2 = (u: wcv.Vector): wcv.Vector => {
	return this[wcv.vectorType(u)]('log2(' + u + ')');
} 

let sqrt = (u: wcv.Vector): wcv.Vector => {
	return this[wcv.vectorType(u)]('sqrt(' + u + ')');
} 

let inversesqrt = (u: wcv.Vector): wcv.Vector => {
	return this[wcv.vectorType(u)]('inversesqrt(' + u + ')');
} 

//COMMON FUNCTIONS

let abs = (u: wcv.Vector): wcv.Vector => {
	return this[wcv.vectorType(u)]('abs(' + u + ')');
} 

let sign = (u: wcv.Vector): wcv.Vector => {
	return this[wcv.vectorType(u)]('sign(' + u + ')');
} 

let floor = (u: wcv.Vector): wcv.Vector => {
	return this[wcv.vectorType(u)]('floor(' + u + ')');
} 

let ceil = (u: wcv.Vector): wcv.Vector => {
	return this[wcv.vectorType(u)]('ceil(' + u + ')');
} 

let fract = (u: wcv.Vector): wcv.Vector => {
	return this[wcv.vectorType(u)]('fract(' + u + ')');
} 

let mod = (u: wcv.Vector, v: wcv.Vector): wcv.Vector => {
	if (v.size > 1) checkDimension(u, v);
	return this[wcv.vectorType(u)]('mod(' + u + ', ' + v + ')');
}

let min = (u: wcv.Vector, v: wcv.Vector): wcv.Vector => {
	if (v.size > 1) checkDimension(u, v);
	return this[wcv.vectorType(u)]('min(' + u + ', ' + v + ')');
}

let max = (u: wcv.Vector, v: wcv.Vector): wcv.Vector => {
	if (v.size > 1) checkDimension(u, v);
	return this[wcv.vectorType(u)]('max(' + u + ', ' + v + ')');
}

let clamp = (u: wcv.Vector, v: wcv.Vector, w: wcv.Vector): wcv.Vector => {
	if (v.size > 1 || w.size > 1) checkDimension(u, v, w);
	return this[wcv.vectorType(u)]('clamp(' + u + ', ' + v + ', ' + w + ')');
}

let mix = (u: wcv.Vector, v: wcv.Vector, w: wcv.Vector): wcv.Vector => {
	checkDimension(u, v);
	if (w.size > 1) checkDimension(u, v, w);
	return this[wcv.vectorType(u)]('mix(' + u + ', ' + v + ', ' + w + ')');
}

let step = (u: wcv.Vector, v: wcv.Vector): wcv.Vector => {
	if (u.size > 1) checkDimension(u, v);
	return this[wcv.vectorType(u)]('step(' + u + ', ' + v + ')');
}

let smoothstep = (u: wcv.Vector, v: wcv.Vector, w: wcv.Vector): wcv.Vector => {
	checkDimension(u, v);
	if (u.size > 1 || v.size > 1) checkDimension(u, v, w);
	return this[wcv.vectorType(u)]('smoothstep(' + u + ', ' + v + ', ' + w + ')');
}

//GEOMETRIC FUNCTIONS

let len = (u: wcv.Vector): wcv.Float => {
	return float('length(' + u + ')');
}

let distance = (u: wcv.Vector, v: wcv.Vector): wcv.Float => {
	checkDimension(u, v);
	return float('distance(' + u + ', ' + v + ')');
}

let dot = (u: wcv.Vector, v: wcv.Vector): wcv.Float => {
	checkDimension(u, v);
	return float('dot(' + u + ', ' + v + ')');
}

let cross = (u: wcv.Vec3, v: wcv.Vec3): wcv.Vec3 => {
	return vec3('cross(' + u + ', ' + v + ')');
}

let normalize = (u: wcv.Vector): wcv.Vector => {
	return this[wcv.vectorType(u)]('normalize(' + u + ')');
} 

let faceforward = (N: wcv.Vector, I: wcv.Vector, Nref: wcv.Vector): wcv.Vector => {
	checkDimension(N, I, Nref);
	return this[wcv.vectorType(N)]('faceforward(' + N + ', ' + I + ', ' + Nref + ')');
}

let reflect = (I: wcv.Vector, N: wcv.Vector): wcv.Vector => {
	checkDimension(I, N);
	return this[wcv.vectorType(I)]('reflect(' + I + ', ' + N + ')');
}

let refract = (I: wcv.Vector, N: wcv.Vector, eta: wcv.Float): wcv.Vector => {
	checkDimension(I, N);
	return this[wcv.vectorType(I)]('refract(' + I + ', ' + N + ', ' + eta + ')');
}