/// <reference path="../src/wcv.ts" />
/// <reference path="../src/wcv_utils.ts" />

function applyFilters(tex : wcv.Texture, args) {

    let ctx = new wcv.Context('#cnv', tex);
	
	ctx.fs.main.append(
		'vec4 pinkify = vec4(0.4, 0, 0.4, 1)',
		'fragColor = fragColor + pinkify'
	);
    
	ctx.render();
}