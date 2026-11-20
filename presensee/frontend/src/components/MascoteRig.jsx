import mascoteEmPe from "../assets/image-removebg-preview (6).png";
import mascoteDescansando from "../assets/mascote-welcome.png";

const BRACO_ESQUERDO = "M35 145 Q55 143 80 149 Q104 155 122 173 L122 195 Q115 215 98 229 Q70 223 48 211 Q36 199 35 180 Z";
const PERNA_ESQUERDA = "M109 254 Q132 258 155 263 Q178 271 184 287 L180 307 Q169 324 143 327 Q119 326 108 307 Z";
const PERNA_DIREITA = "M211 259 Q237 257 266 264 Q286 274 291 294 L284 315 Q270 326 243 326 Q223 319 214 299 Z";
const CABECA = "M205 32 C139 32 102 66 91 119 C82 160 84 193 97 214 C123 222 159 226 205 226 C253 226 286 222 313 213 C327 191 328 158 319 119 C307 66 271 32 205 32 Z";
const BRACO_ESQUERDO_CLIP = "M25 135 Q52 132 83 141 Q112 148 132 168 L132 202 Q122 226 98 239 Q64 231 40 217 Q25 202 25 180 Z";
const PERNA_ESQUERDA_CLIP = "M101 245 Q131 251 160 258 Q186 269 192 287 L187 313 Q172 333 141 335 Q113 331 99 309 Z";
const PERNA_DIREITA_CLIP = "M203 250 Q237 248 272 257 Q295 270 300 294 L292 321 Q273 334 241 334 Q217 324 206 301 Z";
const CABECA_CLIP = "M205 23 C135 23 94 61 82 117 C72 163 75 203 91 226 C120 239 158 244 205 244 C255 244 294 238 321 225 C337 197 338 157 328 117 C315 61 276 23 205 23 Z";

export default function MascoteRig({ estado, olharProximo, elementRef }) {
  const sentado = estado === "sitting";
  const expressao =
    estado === "surprised"
      ? "surpreso"
      : estado === "happy"
        ? "feliz"
        : estado === "doubtful"
          ? "duvida"
          : "";

  return (
    <div
      className={`mascote-rig${sentado ? " mascote-rig--sentado" : ""}${expressao ? ` mascote-rig--${expressao}` : ""}${olharProximo ? " mascote-rig--olhando" : ""}`}
      aria-hidden="true"
      ref={elementRef}
    >
      <img className="mascote-pose-descanso" src={mascoteDescansando} alt="" draggable="false" />
      <svg className="mascote-rig-svg" viewBox="0 0 411 344" focusable="false">
        <defs>
          <mask id="presensee-mascote-base">
            <rect width="411" height="344" fill="#fff" />
            <path d={CABECA} fill="#000" />
            <path d={BRACO_ESQUERDO} fill="#000" />
            <path d={BRACO_ESQUERDO} transform="translate(411 0) scale(-1 1)" fill="#000" />
            <path d={PERNA_ESQUERDA} fill="#000" />
            <path d={PERNA_DIREITA} fill="#000" />
            <ellipse cx="164.5" cy="140" rx="18" ry="20" fill="#000" />
            <ellipse cx="252.5" cy="139" rx="18" ry="20" fill="#000" />
          </mask>
          <clipPath id="presensee-mascote-braco-e">
            <path d={BRACO_ESQUERDO_CLIP} />
          </clipPath>
          <clipPath id="presensee-mascote-cabeca">
            <path d={CABECA_CLIP} />
          </clipPath>
          <clipPath id="presensee-mascote-braco-d">
            <path d={BRACO_ESQUERDO_CLIP} transform="translate(411 0) scale(-1 1)" />
          </clipPath>
          <clipPath id="presensee-mascote-perna-e">
            <path d={PERNA_ESQUERDA_CLIP} />
          </clipPath>
          <clipPath id="presensee-mascote-perna-d">
            <path d={PERNA_DIREITA_CLIP} />
          </clipPath>
          <clipPath id="presensee-mascote-pupila-e">
            <ellipse cx="164.5" cy="140" rx="18" ry="20" />
          </clipPath>
          <clipPath id="presensee-mascote-pupila-d">
            <ellipse cx="252.5" cy="139" rx="18" ry="20" />
          </clipPath>
          <radialGradient id="presensee-mascote-olho" cx="45%" cy="35%">
            <stop offset="0%" stopColor="#fffefa" />
            <stop offset="100%" stopColor="#f3f0eb" />
          </radialGradient>
          <linearGradient id="presensee-mascote-palpebra" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#6877df" />
            <stop offset="100%" stopColor="#443fc3" />
          </linearGradient>
        </defs>

        <image
          className="mascote-rig-corpo"
          href={mascoteEmPe}
          width="411"
          height="344"
          preserveAspectRatio="none"
          mask="url(#presensee-mascote-base)"
        />
        <g className="mascote-rig-braco mascote-rig-braco--esquerdo">
          <image
            href={mascoteEmPe}
            width="411"
            height="344"
            preserveAspectRatio="none"
            clipPath="url(#presensee-mascote-braco-e)"
          />
        </g>
        <g className="mascote-rig-braco mascote-rig-braco--direito">
          <image
            href={mascoteEmPe}
            width="411"
            height="344"
            preserveAspectRatio="none"
            clipPath="url(#presensee-mascote-braco-d)"
          />
        </g>
        <g className="mascote-rig-perna mascote-rig-perna--esquerda">
          <image
            href={mascoteEmPe}
            width="411"
            height="344"
            preserveAspectRatio="none"
            clipPath="url(#presensee-mascote-perna-e)"
          />
        </g>
        <g className="mascote-rig-perna mascote-rig-perna--direita">
          <image
            href={mascoteEmPe}
            width="411"
            height="344"
            preserveAspectRatio="none"
            clipPath="url(#presensee-mascote-perna-d)"
          />
        </g>

        <g className="mascote-rig-cabeca">
          <image
            href={mascoteEmPe}
            width="411"
            height="344"
            preserveAspectRatio="none"
            clipPath="url(#presensee-mascote-cabeca)"
          />
          <g className="mascote-rig-olho mascote-rig-olho--esquerdo">
            <ellipse cx="164.5" cy="140" rx="18" ry="20" fill="url(#presensee-mascote-olho)" />
            <g className="mascote-rig-pupila mascote-rig-pupila--esquerda">
              <image
                href={mascoteEmPe}
                width="411"
                height="344"
                preserveAspectRatio="none"
                clipPath="url(#presensee-mascote-pupila-e)"
              />
            </g>
            <ellipse className="mascote-rig-palpebra" cx="164.5" cy="140" rx="34" ry="35" />
          </g>
          <g className="mascote-rig-olho mascote-rig-olho--direito">
            <ellipse cx="252.5" cy="139" rx="18" ry="20" fill="url(#presensee-mascote-olho)" />
            <g className="mascote-rig-pupila mascote-rig-pupila--direita">
              <image
                href={mascoteEmPe}
                width="411"
                height="344"
                preserveAspectRatio="none"
                clipPath="url(#presensee-mascote-pupila-d)"
              />
            </g>
            <ellipse className="mascote-rig-palpebra" cx="252.5" cy="139" rx="34" ry="35" />
          </g>
        </g>
      </svg>
    </div>
  );
}
