type Breed = 'british' | 'maine' | 'siamese' | 'persian'

const palettes = {
  british: { body: '#8C9AA0', face: '#AAB5B7', inner: '#D8A8A0', chest: '#C8CECA', eye: '#D5B363' },
  maine: { body: '#A87555', face: '#C2926E', inner: '#DFB0A2', chest: '#E8C8A2', eye: '#B9C66E' },
  siamese: { body: '#E8D6B6', face: '#66544F', inner: '#B98C8B', chest: '#F3E5CE', eye: '#8FC7C9' },
  persian: { body: '#D8C7B6', face: '#EEE0D1', inner: '#DCA9AA', chest: '#F8EBDD', eye: '#C9AD79' }
}

export function CatIllustration({ breed, className = '' }: { breed: Breed; className?: string }) {
  const p = palettes[breed]
  const isMaine = breed === 'maine'
  const isPersian = breed === 'persian'
  return <svg className={`cat-svg cat-${breed} ${className}`} viewBox="0 0 340 340" role="img" aria-label={{ british: 'Британский короткошёрстный кот смотрит на пластинку', maine: 'Мейн-кун с кисточками на ушах', siamese: 'Сиамский котик', persian: 'Удивлённый персидский котик' }[breed]}>
    <ellipse cx="174" cy="314" rx="137" ry="17" fill="#4B3A32" opacity=".13" />
    <path className="cat-tail" d="M247 260 C317 219 314 319 270 305" fill="none" stroke={p.body} strokeWidth="29" strokeLinecap="round" />
    <path d="M94 274 C91 215 105 178 169 173 C239 170 259 218 251 284 Q247 314 176 316 Q102 315 94 274Z" fill={p.body} stroke="#4B3A32" strokeWidth="5" />
    <path d="M133 249 Q174 221 216 249 L213 308 Q170 326 129 306Z" fill={p.chest} opacity=".92" />
    <ellipse cx="119" cy="296" rx="33" ry="18" fill={p.face} stroke="#4B3A32" strokeWidth="4" />
    <ellipse cx="226" cy="296" rx="33" ry="18" fill={p.face} stroke="#4B3A32" strokeWidth="4" />
    <path d={isMaine ? 'M72 98 L91 26 L112 73 Q172 37 224 74 L245 25 L268 103' : isPersian ? 'M83 111 L97 62 L120 94 Q173 65 224 94 L247 62 L260 110' : 'M80 107 L91 49 L122 86 Q172 67 223 86 L252 49 L264 109'} fill={p.body} stroke="#4B3A32" strokeWidth="5" strokeLinejoin="round" />
    <path d="M92 88 L98 66 L116 91 M228 90 L246 66 L252 91" fill={p.inner} stroke="none" />
    {isMaine && <><path d="M92 35 l-9 -25 M249 35 l9 -25" stroke={p.body} strokeWidth="10" strokeLinecap="round" /><path d="M74 155 l-22 18 29 -3 M265 155 l22 18 -29 -3" fill={p.body} stroke="#4B3A32" strokeWidth="3" /></>}
    <path d={isPersian ? 'M77 140 C68 81 105 74 170 77 C235 74 271 84 264 143 C272 211 225 250 170 252 C112 249 66 210 77 140Z' : 'M77 139 C74 92 106 76 170 76 C236 76 264 92 264 139 C267 211 225 251 170 252 C113 251 74 208 77 139Z'} fill={p.face} stroke="#4B3A32" strokeWidth="5" />
    {breed === 'siamese' && <path d="M121 139 Q170 112 220 139 Q220 198 170 226 Q119 197 121 139Z" fill="#75605A" opacity=".45" />}
    {isMaine && <><path d="M106 105 l-25 29 26 -8 M233 105 l25 29 -26 -8" fill={p.body} /><path d="M128 111 l-8 22 M211 111 l8 22" stroke="#805C45" strokeWidth="5" strokeLinecap="round" /></>}
    <ellipse cx="130" cy="156" rx={isPersian ? '20' : '17'} ry={isPersian ? '22' : '20'} fill="#fff9ed" /><ellipse cx="212" cy="156" rx={isPersian ? '20' : '17'} ry={isPersian ? '22' : '20'} fill="#fff9ed" />
    <ellipse className="cat-eye" cx="132" cy="158" rx="7" ry="13" fill={p.eye} /><ellipse className="cat-eye" cx="210" cy="158" rx="7" ry="13" fill={p.eye} />
    <ellipse className="cat-pupil" cx="132" cy="158" rx="3" ry="10" fill="#302B2A" /><ellipse className="cat-pupil" cx="210" cy="158" rx="3" ry="10" fill="#302B2A" />
    <ellipse cx="152" cy="200" rx="23" ry="17" fill="#F8EEE2" /><ellipse cx="190" cy="200" rx="23" ry="17" fill="#F8EEE2" />
    <path d="M160 188 Q170 181 181 188 L171 198Z" fill={p.inner} stroke="#4B3A32" strokeWidth="2" strokeLinejoin="round" />
    <path d="M171 199 v7 q-10 12 -18 0 M171 206 q10 12 18 0" fill="none" stroke="#4B3A32" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M138 198 l-48 -9 M137 207 l-50 7 M204 198 l48 -9 M205 207 l50 7" stroke="#4B3A32" strokeWidth="2" strokeLinecap="round" />
    {isPersian && <><circle cx="112" cy="187" r="8" fill="#E8B8AC" opacity=".55" /><circle cx="229" cy="187" r="8" fill="#E8B8AC" opacity=".55" /></>}
  </svg>
}
