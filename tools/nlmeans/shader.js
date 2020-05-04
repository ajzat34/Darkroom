// genorate nlmeans frag shaders

// functions for gaussian distributions and 2d arrays

// calculate the area <x under the normal curve
function normalcdf(x) {
  return 0.5 * (1 + erf(x));
}

// constants for erf
var a1 =  0.254829592;
var a2 = -0.284496736;
var a3 =  1.421413741;
var a4 = -1.453152027;
var a5 =  1.061405429;
var p  =  0.3275911;

function erf(x) {
    // Save the sign of x
    var sign = 1;
    if (x < 0) {
        sign = -1;
    }
    x = Math.abs(x);

    // A&S formula 7.1.26
    var t = 1.0/(1.0 + p*x);
    var y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-x*x);

		return sign*y
}

function gaussian(x, stdev) {
  return normalcdf(x/stdev)
}

// get the area between two values on the normal curve
function gaussianRange(a, b, stdev) {
	var av = gaussian(a, stdev)
	var bv = gaussian(b, stdev)
  if (bv > av){
		return bv - av
  }
	return av - bv
}

// gets the area under the normal curve inside a pixel
function gaussianPixel (n, spread) {
	return gaussianRange(n - 0.5, n + 0.5, spread)
}

// create a gaussian distribution given the number of included pixels
function gaussianNDist(n, spread) {
	var result = new Array()
	var total = 0
	for (var i = 0; i<(n-1); i++) {
		var g = gaussianPixel(i, spread)
    result[i] = g
		// keep track of total
		// non-center values must be counted twice
		if (i == 0){ total += g
		} else { total += 2*g }
	}
	result.push( (1.0-total)/2 )
  return result
}

// gets the number of samples after the center sample
function nFromKsize(n) {
  return ((n-1)/2)+1
}

// makes the sum of the array 1
function normalizeArray(arr) {
  var sum = arr.reduce((accumulator, currentValue) => accumulator + currentValue)
  for (var i = 0; i < arr.length; i++) {
    arr[i] /= sum
  }
  return arr
}

// create a gaussian 2d distribution
function gaussianNDist2D(ksize, spread) {
  var n = nFromKsize(ksize)
  var gdist = gaussianNDist(n, spread)
  // create the other half of the distribution
  var dup = []
  for (var i = gdist.length-1; i > 0; i--) {
    dup.push(gdist[i])
  }
  gdist = normalizeArray(dup.concat(gdist))

  var result = []

  for (var y = 0; y < ksize; y++) {
    var yw = gdist[y]
    for (var x = 0; x < ksize; x++) {
      result[(y*ksize)+x] = gdist[x]*yw
    }
  }
  return normalizeArray(result)
}


module.exports=function(kn,sn){
  // kernal area
  // var kn = 1 // radius of patches in pixels
  var ks = (kn*2)+1 // dimentions of patches in pixels
  var ksq = ks*ks // area of patches in pixels

  // search area
  // var sn = 2 // radius of search area in pixels
  var ss = (sn*2)+1// dimentions of search area in pixels
  var ssq = ss*ss // area of search area in pixels

  var sscenter = (ss*sn)+(sn)

  var kv = []
  for (var y = kn; y>=-kn; y--){
    for (var x = -kn; x<=kn; x++){
      kv.push({x: x, y: y})
    }
  }

  var sv = []
  for (var y = sn; y>=-sn; y--){
    for (var x = -sn; x<=sn; x++){
      sv.push({x: x, y: y})
    }
  }

  var gaussianWeights = gaussianNDist2D(ks, kn+1)

  var header =
  `# version 300 es
  // generated by OpenDarkroom/tools/nlmeans
  // impliments fast nlmeans filter in glsl
  uniform sampler2D texSampler;
  uniform highp float amount;
  uniform ivec2 size;
  uniform bool vnoise;
  uniform bool vweights;
  uniform int selweight;
  uniform highp float mag;
  in highp vec2 textureCoord;
  out highp vec4 fragmentColor;
  const highp vec3 dotsums = vec3(0.33333333333,0.33333333333,0.33333333333);
  highp vec4 csample(ivec2 s) {return texelFetch(texSampler, ivec2(clamp(s.x, 0, size.x-1), clamp(s.y, 0, size.y-1)), 0);}
  highp vec3 rgbsample(ivec2 s) {return texelFetch(texSampler, ivec2(clamp(s.x, 0, size.x-1), clamp(s.y, 0, size.y-1)), 0).rgb;}
  `

  var genKsample = `void sampleKernal(ivec2 center, inout vec3 [${ksq}]src)`
  genKsample += '{\n'
  kv.forEach((sample, i) => {
    genKsample += ` src[${i}] = rgbsample(center+ivec2(${sample.x},${sample.y}));\n`
  })
  genKsample += '}\n'

  var genPlaceCompare = `highp float placeAndCompare(ivec2 center, vec3 [${ksq}]compare, inout vec3 insample)`
  genPlaceCompare += '{\n'
  genPlaceCompare += `  highp float acc = 0.001;\n`
  genPlaceCompare += `  highp vec3 diff;\n`
  kv.forEach((sample, i) => {
    genPlaceCompare += `  ( diff = rgbsample(center+ivec2(${sample.x},${sample.y})) -compare[${i}]) * ${gaussianWeights[i]};\n`
    genPlaceCompare += `  acc += dot(diff*diff, dotsums);\n`
  })
  genPlaceCompare += `  insample = rgbsample(center);\n`
  genPlaceCompare += `  return acc/${ks*ks}.0;\n`
  genPlaceCompare += '}\n'

  var main = `void main(void)`
  main += '{\n'
  main += `
    highp ivec2 p = ivec2(int(textureCoord.x * float(size.x)), int(textureCoord.y * float(size.y)));
    highp vec4 color = csample(p);
    highp float [${ssq}]finalKernalWeights;
    highp vec3 [${ssq}]finalKernalSamples;
    highp vec3 [${ksq}]center;

    sampleKernal(p+ivec2( 0, 0), center);
  `
  sv.forEach((sample, i) => {
    if (i === sscenter) {
      main += ` finalKernalWeights[${i}] = 0.01;\n`
      main += ` finalKernalSamples[${i}] = color.rgb;\n`
    } else {
      main += ` finalKernalWeights[${i}] = placeAndCompare(p+ivec2(${sample.x}, ${sample.y}), center, finalKernalSamples[${i}]);\n`
    }
  })
  main += ` highp float maxweight = 0.0;\n`
  sv.forEach((sample, i) => {
    main += ` if (finalKernalWeights[${i}] > maxweight) {maxweight = finalKernalWeights[${i}];}\n`
  })

  sv.forEach((sample, i) => {
    main += ` finalKernalWeights[${i}] = maxweight-finalKernalWeights[${i}];\n`
  })

  var sums = []
  sv.forEach((sample, i) => {
    sums.push(`finalKernalWeights[${i}]`)
  })
  main += ` highp float weightsum = ${sums.join('+')};\n`

  main += ` highp vec3 acc = vec3(0);\n`
  sv.forEach((sample, i) => {
    main += ` acc += (finalKernalWeights[${i}]/weightsum)*finalKernalSamples[${i}];\n`
  })
  main += `
    fragmentColor.rgb = acc;
    fragmentColor.a  = 1.0;
  `
  main += '}\n'

  final = ''
  final += header
  final += genKsample
  final += genPlaceCompare
  final += main

  console.log(kn, sn, ks, ss)

  return final
}
