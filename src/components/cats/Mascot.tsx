import type { Species } from '../../features/animal-detection/logic'

export function Mascot({ species, dancing = false, compact = false }: { species: Species; dancing?: boolean; compact?: boolean }) {
  const dog = species === 'dog'
  return <svg className={`mascot ${dancing ? 'mascot-dancing' : ''} ${compact ? 'mascot-compact' : ''}`} viewBox="0 0 360 390" role="img" aria-label={dog ? 'Рисованный корги рядом с пластинкой' : 'Рисованный рыжий кот рядом с пластинкой'}>
    <ellipse cx="179" cy="363" rx="139" ry="18" fill="#5c4534" opacity=".14" />
    <g className="mascot-tail"><path d={dog ? 'M261 277 C317 251 328 289 301 299' : 'M264 277 C339 311 335 196 292 211'} fill="none" stroke={dog ? '#d69a62' : '#c47543'} strokeWidth="32" strokeLinecap="round" /></g>
    <g className="mascot-body">
      <path d="M96 224 C85 171 120 149 180 156 C244 151 272 191 264 261 C260 326 225 353 178 355 C129 357 91 322 96 224Z" fill={dog ? '#dba36b' : '#d7834f'} stroke="#624536" strokeWidth="5" />
      <ellipse cx="182" cy="269" rx="53" ry="71" fill={dog ? '#fff0d1' : '#f0b782'} />
      <path d="M118 304 Q82 335 107 347 Q133 350 142 321M224 320 Q244 353 268 341 Q281 326 246 302" fill={dog ? '#dba36b' : '#d7834f'} stroke="#624536" strokeWidth="5" />
      <g className="mascot-arm"><path d="M106 238 Q57 255 76 286 Q91 295 119 268" fill={dog ? '#dba36b' : '#d7834f'} stroke="#624536" strokeWidth="5" /></g>
      <path d="M251 240 Q300 247 285 282 Q269 292 247 264" fill={dog ? '#dba36b' : '#d7834f'} stroke="#624536" strokeWidth="5" />
      {dog ? <>
        <path d="M99 136 Q61 102 68 65 Q77 33 123 77 L136 137M225 130 Q258 31 291 56 Q310 84 252 154" fill="#b9784d" stroke="#624536" strokeWidth="5" />
        <ellipse cx="180" cy="165" rx="100" ry="88" fill="#dba36b" stroke="#624536" strokeWidth="5" />
        <path d="M94 141 Q89 208 130 211 Q141 171 126 130M265 139 Q273 204 229 211 Q222 171 234 131" fill="#b9784d" />
        <path d="M139 178 Q180 145 223 179 L211 222 Q182 239 150 219Z" fill="#fff0d1" />
      </> : <>
        <path d="M94 133 L93 50 Q99 30 151 94M213 94 Q264 30 273 51 L270 135" fill="#d7834f" stroke="#624536" strokeWidth="5" />
        <path d="M107 119 L106 65 L143 104M220 104 L258 65 L256 120" fill="#edae83" />
        <ellipse cx="181" cy="160" rx="98" ry="88" fill="#d7834f" stroke="#624536" strokeWidth="5" />
        <path d="M91 159 Q126 134 136 162M225 161 Q247 135 269 158" fill="none" stroke="#bd7046" strokeWidth="9" strokeLinecap="round" />
        <ellipse cx="180" cy="201" rx="49" ry="30" fill="#f2bd90" />
      </>}
      <g className="mascot-eyes"><ellipse cx="146" cy="159" rx="10" ry="15" fill="#43362e" /><ellipse cx="215" cy="159" rx="10" ry="15" fill="#43362e" /><circle cx="149" cy="154" r="3" fill="#fff" /><circle cx="218" cy="154" r="3" fill="#fff" /></g>
      <path d="M168 190 Q181 199 194 190 Q181 184 168 190Z" fill="#624536" /><path d="M181 196 Q169 212 154 202 M181 196 Q193 212 208 202" fill="none" stroke="#624536" strokeWidth="3" strokeLinecap="round" />
      {!dog && <><path d="M126 195 L91 189 M127 202 L86 207 M234 195 L270 189 M234 202 L275 207" stroke="#624536" strokeWidth="2.5" strokeLinecap="round" /></>}
      <path d="M141 96 Q182 73 222 96" fill="none" stroke="#f3be87" strokeWidth="7" strokeLinecap="round" />
    </g>
    <path d="M273 97 L291 71 L300 102" fill="#d9aa73" opacity=".85" />
  </svg>
}
