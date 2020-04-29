var sliderDark = 'rgba(120, 120, 120, 1)'
var sliderLight = 'rgba(255,255,255,1)'

var redstyle = `background: linear-gradient(90deg, rgba(113,113,113,1) 0%, rgba(255,27,60,1) 100%);`
var greenstyle = `background: linear-gradient(90deg, rgba(113,113,113,1) 0%, rgba(27,255,139,1) 100%);`
var bluestyle = `background: linear-gradient(90deg, rgba(113,113,113,1) 0%, rgba(51,132,255,1) 100%);`


module.exports = {
  name: 'Color Mixer',
  tooltip: 'Mix Color channels',
  knobs: {
    'Master': {
      type: 'trislider',
      minValue: 0,
      maxValue: 200,
      step: 1,
      tooltip: 'Brighten or Darken each color channel',
      sliders: [
        {
          name: 'Red',
          value: 100,
          style: redstyle,
        },
        {
          name: 'Green',
          value: 100,
          style: greenstyle,
        },
        {
          name: 'Blue',
          value: 100,
          style: bluestyle,
        },
      ]
    },
    'Red': {
      type: 'trislider',
      minValue: 0,
      maxValue: 100,
      step: 1,
      tooltip: 'Remap RGB channels to Red Channel',
      sliders: [
        {
          name: 'Red',
          value: 100,
          style: redstyle,
        },
        {
          name: 'Green',
          value: 0,
          style: greenstyle,
        },
        {
          name: 'Blue',
          value: 0,
          style: bluestyle,
        },
      ]
    },

    'Green': {
      type: 'trislider',
      minValue: 0,
      maxValue: 100,
      step: 1,
      tooltip: 'Remap RGB channels to Green Channel',
      sliders: [
        {
          name: 'Red',
          value: 0,
          style: redstyle,
        },
        {
          name: 'Green',
          value: 100,
          style: greenstyle,
        },
        {
          name: 'Blue',
          value: 0,
          style: bluestyle,
        },
      ]
    },

    'Blue': {
      type: 'trislider',
      minValue: 0,
      maxValue: 100,
      step: 1,
      tooltip: 'Remap RGB channels to Blue Channel',
      sliders: [
        {
          name: 'Red',
          value: 0,
          style: redstyle,
        },
        {
          name: 'Green',
          value: 0,
          style: greenstyle,
        },
        {
          name: 'Blue',
          value: 100,
          style: bluestyle,
        },
      ]
    },
  },
  takesMask: true,
  framebuffers: [],
  stages: [
    {
      shadername: 'colormat',
      atrribVertexCoord: 'aVertex',
      atrribTextureCoord: 'aTextureCoord',
      uniforms: {
        // bind name : in-shader name
        '__imagesize__': 'size',
        'r': 'r',
        'g': 'g',
        'b': 'b',
      },
      knob_bindings: {
        'Red': function(v, set, k) {
          var r = k['Red'].value
          var rsum = (r[0] + r[1] + r[2]) / (k['Master'].value[0]/100)
          var rn = [r[0]/rsum, r[1]/rsum, r[2]/rsum]

          var g = k['Green'].value
          var gsum = (g[0] + g[1] + g[2]) / (k['Master'].value[1]/100)
          var gn = [g[0]/gsum, g[1]/gsum, g[2]/gsum]

          var b = k['Blue'].value
          var bsum = (b[0] + b[1] + b[2]) / (k['Master'].value[2]/100)
          var bn = [b[0]/bsum, b[1]/bsum, b[2]/bsum]

          console.log(rn,gn,bn)
          set('r', 'vec3', rn)
          set('g', 'vec3', gn)
          set('b', 'vec3', bn)
        }
      },
      inputs: ['in', 'mask'],
      inputBindings: ['texSampler', 'maskSampler'],
      out: 'out',
    },
  ],
}
