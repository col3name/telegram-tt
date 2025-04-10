import React, { type FC, memo, useEffect, useRef } from '../../lib/teact/teact';

import { withGlobal } from '../../global';
import { selectCanAnimateInterface, selectTheme } from '../../global/selectors';
import { ThemeKey } from '../../types';
import buildClassName from '../../util/buildClassName';
// import {preloadImage} from '../../util/files';

import AnimalsPattern from '../../assets/patterns/animals.svg';
import BeachPattern from '../../assets/patterns/beach.svg';
import AstronautCatsPattern from '../../assets/patterns/astronaut_cats.svg';
import CatsAndDogsPattern from '../../assets/patterns/cats_and_dogs.svg';
import ChristmasPattern from '../../assets/patterns/christmas.svg';
import FantasyPattern from '../../assets/patterns/fantasy.svg';
import LateNightDelightPatterm from '../../assets/patterns/late_night_delight.svg';
import MagicPattern from '../../assets/patterns/magic.svg';
import MathPattern from '../../assets/patterns/math.svg';
import ParisPattern from '../../assets/patterns/paris.svg';
import GamesPattern from '../../assets/patterns/games.svg';
import SnowflakesPattern from '../../assets/patterns/snowflakes.svg';
import SpacePattern from '../../assets/patterns/space.svg';
import StarWarsPattern from '../../assets/patterns/star_wars.svg';
import SweetsPattern from '../../assets/patterns/sweets.svg';
import TattoosPattern from '../../assets/patterns/tattoos.svg';
import UnderwaterWorldPattern from '../../assets/patterns/underwater_world.svg';
import ZooPattern from '../../assets/patterns/zoo.svg';
import UnicornPattern from '../../assets/patterns/unicorn.svg';

import './twallpaper-webgl/src/styles.css';

export const maskImages: string[] = [
  'animals',
  'astronaut_cats',
  'beach',
  'cats_and_dogs',
  'christmas',
  'fantasy',
  'late_night_delight',
  'magic',
  'math',
  'paris',
  'games',
  'snowflakes',
  'space',
  'star_wars',
  'sweets',
  'tattoos',
  'underwater_world',
  'zoo',
  'unicorn',
];

const parsePatternColors = (colors: string[]|undefined) => {
  if (!colors || colors?.length !== 4) {
    return {
      color1: '#fec496',
      color2: '#dd6cb9',
      color3: '#962fbf',
      color4: '#4f5bd5',
    };
  }

  return {
    color1: colors[0],
    color2: colors[1],
    color3: colors[2],
    color4: colors[3],
  };
};

function loadShaders(
  gl,
  shaderSources,
) {
  const [vrtxShader, fragmentShader] = shaderSources;
  return [
    loadShader(gl, vrtxShader, gl.VERTEX_SHADER),
    loadShader(gl, fragmentShader, gl.FRAGMENT_SHADER),
  ];
}

function loadShader(
  gl,
  shaderSource,
  shaderType,
) {
  const shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  return shader;
}

function hexToVec3(
  hex,
) {
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return [r, g, b];
}

const vertexShader = `
// an attribute will receive data from a buffer
attribute vec4 a_position;

// all shaders have a main function
void main() {

  // gl_Position is a special variable a vertex shader
  // is responsible for setting
  gl_Position = a_position;
}
`;

const fragmentShader = `
  precision highp float;

  uniform vec2 resolution;

  uniform vec3 color1;
  uniform vec3 color2;
  uniform vec3 color3;
  uniform vec3 color4;

  uniform vec2 color1Pos;
  uniform vec2 color2Pos;
  uniform vec2 color3Pos;
  uniform vec2 color4Pos;

  void main() {
    vec2 position = gl_FragCoord.xy / resolution.xy;
    position.y = 1.0 - position.y;

    float dp1 = distance(position, color1Pos);
    float dp2 = distance(position, color2Pos);
    float dp3 = distance(position, color3Pos);
    float dp4 = distance(position, color4Pos);
    float minD = min(dp1, min(dp2, min(dp3, dp4)));
    float p = 3.0;

    dp1 = pow(1.0 - (dp1 - minD), p);
    dp2 = pow(1.0 - (dp2 - minD), p);
    dp3 = pow(1.0 - (dp3 - minD), p);
    dp4 = pow(1.0 - (dp4 - minD), p);
    float dpt = abs(dp1 + dp2 + dp3 + dp4);

    gl_FragColor =
      (vec4(color1 / 255.0, 1.0) * dp1 / dpt) +
      (vec4(color2 / 255.0, 1.0) * dp2 / dpt) +
      (vec4(color3 / 255.0, 1.0) * dp3 / dpt) +
      (vec4(color4 / 255.0, 1.0) * dp4 / dpt);
  }
`;

function updateMask(config, wallpaperContainer: HTMLDivElement, gradientCanvas: HTMLCanvasElement) {
  if (!wallpaperContainer || !gradientCanvas) {
    return;
  }
  const { isEnabled, backgroundColor, maskImage, size } = config.pattern;

  wallpaperContainer.style.setProperty('--tw-size', `${size}px`);
  wallpaperContainer.style.setProperty('--tw-background', backgroundColor);

  // let href = window.location.href;
  const href = './';
  let url = `${href}patterns/${maskImage}.svg`;
  switch (maskImage) {
    case 'animals': {
      url = AnimalsPattern;
      break;
    }
    case 'beach': {
      url = BeachPattern;
      break;
    }
    case 'astronaut_cats': {
      url = AstronautCatsPattern;
      break;
    }
    case 'cats_and_dogs': {
      url = CatsAndDogsPattern;
      break;
    }
    case 'christmas': {
      url = ChristmasPattern;
      break;
    }
    case 'fantasy': {
      url = FantasyPattern;
      break;
    }
    case 'late_night_delight': {
      url = LateNightDelightPatterm;
      break;
    }
    case 'magic': {
      url = MagicPattern;
      break;
    }
    case 'math': {
      url = MathPattern;
      break;
    }
    case 'paris': {
      url = ParisPattern;
      break;
    }
    case 'games': {
      url = GamesPattern;
      break;
    }
    case 'snowflakes': {
      url = SnowflakesPattern;
      break;
    }
    case 'space': {
      url = SpacePattern;
      break;
    }
    case 'star_wars': {
      url = StarWarsPattern;
      break;
    }
    case 'sweets': {
      url = SweetsPattern;
      break;
    }
    case 'tattoos': {
      url = TattoosPattern;
      break;
    }
    case 'underwater_world': {
      url = UnderwaterWorldPattern;
      break;
    }
    case 'zoo': {
      url = ZooPattern;
      break;
    }
    case 'unicorn': {
      url = UnicornPattern;
      break;
    }
    default:
      url = AnimalsPattern;
      break;
  }

  wallpaperContainer.style.setProperty(
    '--tw-image',
    `url(${url})`,
  );

  if (isEnabled) {
    gradientCanvas.classList.add('wallpaper-mask');
  } else {
    gradientCanvas.classList.remove('wallpaper-mask');
  }
}

export const BgWallpaper: FC<OwnProps & StateProps> = ({
  setBgSignalValue,
  colors: patternColors,
  withInterfaceAnimations,
  pattern,
  isDark,
  isBlurred,
  isDarkTheme,
  intensity,
}) => {
  const config = {
    pattern: {
      isEnabled: false,
      maskImage: pattern,
      size: 420,
      backgroundColor: '#000',
    },
    colors: parsePatternColors(patternColors),
  };
  const wallpaperContainerRef = useRef<HTMLDivElement>();
  const gradientCanvasRef = useRef<HTMLCanvasElement>();
  const wallpaperMaskRef = useRef<HTMLDivElement>();

  useEffect(() => {
    if (!pattern) {
      return;
    }

    const colors = {
      color1: hexToVec3(config.colors.color1),
      color2: hexToVec3(config.colors.color2),
      color3: hexToVec3(config.colors.color3),
      color4: hexToVec3(config.colors.color4),
    };
    const gradientCanvas = gradientCanvasRef.current;
    if (!gradientCanvas) {
      return;
    }
    gradientCanvas.classList.add('wallpaper-canvas');

    const wallpaperContainer = wallpaperContainerRef.current;
    if (!wallpaperContainer) {
      return;
    }
    updateMask(config, wallpaperContainer, gradientCanvas);

    const gl = gradientCanvas.getContext('webgl');
    if (!gl) {
      return;
      // throw new Error('WebGL not supported');
    }

    // setup GLSL program
    const program = gl.createProgram();
    if (!program) {
      return;
      // throw new Error('Unable to create WebGLProgram');
    }

    // load shaders
    const shaders = loadShaders(gl, [vertexShader, fragmentShader]);
    for (const shader of shaders) {
      gl.attachShader(program, shader);
    }

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      // alert('Unable to initialize the shader program.');
      return;
    }

    gl.useProgram(program);

    // look up where the vertex data needs to go.
    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');

    // Create a buffer to put three 2d clip space points in
    const positionBuffer = gl.createBuffer();

    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // fill it with a 2 triangles that cover clipspace
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1,
        -1, // first triangle
        1,
        -1,
        -1,
        1,
        -1,
        1, // second triangle
        1,
        -1,
        1,
        1,
      ]),
      gl.STATIC_DRAW,
    );

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Turn on the attribute
    gl.enableVertexAttribArray(positionAttributeLocation);

    // Bind the position buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    gl.vertexAttribPointer(
      positionAttributeLocation,
      2, // 2 components per iteration
      gl.FLOAT, // the data is 32bit floats
      false, // don't normalize the data
      0, // 0 = move forward size * sizeof(type) each iteration to get the next position
      0, // start at the beginning of the buffer
    );

    const resolutionLoc = gl.getUniformLocation(program, 'resolution');
    const color1Loc = gl.getUniformLocation(program, 'color1');
    const color2Loc = gl.getUniformLocation(program, 'color2');
    const color3Loc = gl.getUniformLocation(program, 'color3');
    const color4Loc = gl.getUniformLocation(program, 'color4');
    const color1PosLoc = gl.getUniformLocation(program, 'color1Pos');
    const color2PosLoc = gl.getUniformLocation(program, 'color2Pos');
    const color3PosLoc = gl.getUniformLocation(program, 'color3Pos');
    const color4PosLoc = gl.getUniformLocation(program, 'color4Pos');

    const keyPoints = [
      [0.265, 0.582], //0
      [0.176, 0.918], //1
      [1 - 0.585, 1 - 0.164], //0
      [0.644, 0.755], //1
      [1 - 0.265, 1 - 0.582], //0
      [1 - 0.176, 1 - 0.918], //1
      [0.585, 0.164], //0
      [1 - 0.644, 1 - 0.755] //1
    ]
    let keyShift = 0;
    let targetColor1Pos;
    let targetColor2Pos;
    let targetColor3Pos;
    let targetColor4Pos;

    updateTargetColors();

    function updateTargetColors() {
      targetColor1Pos = keyPoints[keyShift % 8];
      targetColor2Pos = keyPoints[(keyShift + 2) % 8];
      targetColor3Pos = keyPoints[(keyShift + 4) % 8];
      targetColor4Pos = keyPoints[(keyShift + 6) % 8];
      keyShift = (keyShift + 1) % 8;
    }

    let color1Pos = [targetColor1Pos![0], targetColor1Pos![1]];
    let color2Pos = [targetColor2Pos![0], targetColor2Pos![1]];
    let color3Pos = [targetColor3Pos![0], targetColor3Pos![1]];
    let color4Pos = [targetColor4Pos![0], targetColor4Pos![1]];

    renderGradientCanvas();

    function renderGradientCanvas() {
      if (!gl) {
        return;
      }
      gl.uniform2fv(resolutionLoc, [gl.canvas.width, gl.canvas.height]);
      gl.uniform3fv(color1Loc, colors.color1);
      gl.uniform3fv(color2Loc, colors.color2);
      gl.uniform3fv(color3Loc, colors.color3);
      gl.uniform3fv(color4Loc, colors.color4);
      gl.uniform2fv(color1PosLoc, color1Pos);
      gl.uniform2fv(color2PosLoc, color2Pos);
      gl.uniform2fv(color3PosLoc, color3Pos);
      gl.uniform2fv(color4PosLoc, color4Pos);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function distance(p1, p2) {
      return Math.sqrt(
        // (p1[0] - p2[0]) * (p1[0] - p2[0]),
        (p1[1] - p2[1]) * (p1[1] - p2[1]),
      );
    }

    const speed = 0.1;
    let animating = false;

    const animate = () => {
      animating = true;
      if (
        distance(color1Pos, targetColor1Pos) > 0.01 || distance(color2Pos, targetColor2Pos) > 0.01
        || distance(color3Pos, targetColor3Pos) > 0.01 || distance(color3Pos, targetColor3Pos) > 0.01
      ) {
        color1Pos[0] = color1Pos[0] * (1 - speed) + targetColor1Pos[0] * speed;
        color1Pos[1] = color1Pos[1] * (1 - speed) + targetColor1Pos[1] * speed;
        color2Pos[0] = color2Pos[0] * (1 - speed) + targetColor2Pos[0] * speed;
        color2Pos[1] = color2Pos[1] * (1 - speed) + targetColor2Pos[1] * speed;
        color3Pos[0] = color3Pos[0] * (1 - speed) + targetColor3Pos[0] * speed;
        color3Pos[1] = color3Pos[1] * (1 - speed) + targetColor3Pos[1] * speed;
        color4Pos[0] = color4Pos[0] * (1 - speed) + targetColor4Pos[0] * speed;
        color4Pos[1] = color4Pos[1] * (1 - speed) + targetColor4Pos[1] * speed;
        renderGradientCanvas();
        requestAnimationFrame(animate);
      } else {
        animating = false;
      }
    };

    const listener = () => {
      if (!withInterfaceAnimations) {
        return;
      }
      updateTargetColors();
      if (!animating) {
        requestAnimationFrame(animate);
      }
    };
    document.addEventListener('onAnimatedChatBackground', listener);
    if (withInterfaceAnimations) {
      setBgSignalValue(listener);
    } else {
      setBgSignalValue(() => {});
    }
    // eslint-disable-next-line consistent-return
    return () => {
      document.removeEventListener('onAnimatedChatBackground', listener);
    };
  }, [withInterfaceAnimations, config, pattern, patternColors, setBgSignalValue]);

  const prefPattern = useRef(pattern);

  if (prefPattern.current !== pattern) {
    prefPattern.current = pattern;
    updateMask(config, wallpaperContainerRef.current, gradientCanvasRef.current);
  }


  if (!pattern) {
    return undefined;
  }
  return (
    <div id="animatedWallpaper">
      <div
        id="wallpaper"
        ref={wallpaperContainerRef}
        className={buildClassName(
          'wallpaper-wrapper',
          isDarkTheme && 'wallpaper-dark',
        )}
      >
        <canvas ref={gradientCanvasRef} className="wallpaper-canvas" />
        <div ref={wallpaperMaskRef} className="wallpaper-pattern" />
      </div>
    </div>
  );
};

export type OwnProps = {
  isDark?: boolean;
  isBlurred?: boolean;
  theme: ThemeKey;
  setBgSignalValue?: any;
  withInterfaceAnimations?: boolean;
};

type StateProps = {
  pattern?: string;
  theme: ThemeKey;
  colors?: string[];
  isDarkTheme?: boolean;
  intensity?: number;
};

const AnimatedBackground = memo(withGlobal<OwnProps>(
  (global): StateProps => {
    const theme = selectTheme(global);
    const them = global.settings.themes[theme] || {};
    const { isBlurred, pattern, colors, intensity } = them;

    return {
      pattern,
      intensity,
      isBlurred,
      isDarkTheme: intensity < 0 || theme === 'dark',
      colors: theme === 'light' ? colors : ['#7fa381', '#fff5c5', '#336f55', '#fbe37d'],
      withInterfaceAnimations: selectCanAnimateInterface(global),
      // background,
      // isBlurred,
      // loadedWallpapers,
      theme,
    };
  },
)(BgWallpaper));
export default AnimatedBackground;
