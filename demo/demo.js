/// <reference path="../src/wcv.ts" />
/// <reference path="../src/wcv_utils.ts" />
function applyFilters(tex, args) {
    var ctx = new wcv.Context('#cnv', tex);
    var G = ctx.sobel(tex);
    ctx.fs.main.append('vec4 color = vec4(vec3(0), 1)', _if(len(distance(ctx.fragColor, vec4(0.75, 0.31, 0.34, 1))).lss(float(0.15)), 'color = ' + vec4(0, 1, 0, 1)));
    ctx.fragColor.set('color');
    ctx.render();
}
