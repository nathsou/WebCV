/// <reference path="../src/wcv.ts" />
/// <reference path="../src/wcv_utils.ts" />
function applyFilters(tex, args) {
    var ctx = new wcv.Context('#cnv', tex);
    ctx.fragColor.set(vec4(vec3(ctx.sobel(tex)), 1));
    ctx.render();
}
