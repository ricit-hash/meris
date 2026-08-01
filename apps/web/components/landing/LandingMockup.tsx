export function ManifestMockup() {
  return <div className="ref-mockup ref-manifest"><div className="ref-windowbar"><i/><i/><i/><span>manifest.preview</span></div><div className="ref-sidebar"><b>Meris</b><span>Overview</span><span>Schema</span><span>Access</span></div><div className="ref-windowmain"><small>DATASET MANIFEST</small><strong>weather_observations</strong><div className="ref-lines"><span/><span/><span/></div><div className="ref-status"><em/> Shelby pointer connected</div></div></div>;
}
export function AgentMockup({kind='orbit'}:{kind?:string}) {
  if (kind==='orbit') return <div className="ref-feature-ui ref-orbit-ui"><span className="ref-star">✦</span>{[0,45,90,135,180,225,270,315].map(n=><i key={n} style={{transform:`rotate(${n}deg) translateY(-34px)`}}/>)}</div>;
  if (kind==='permission') return <div className="ref-feature-ui ref-permission"><small>ACCESS REQUEST</small><strong>Range preview</strong><p>weather_observations.parquet</p><button>Approve range</button></div>;
  return <div className="ref-feature-ui ref-task"><small>RANGE REQUEST</small><strong>Preview rows 0–128</strong><div><em/> Shelby · ready</div><button>Inspect slice</button></div>;
}
export function ClosingMockup() { return <div className="ref-closing-ui"><div className="ref-closing-top"><b>Meris workspace</b><span>•••</span></div><div className="ref-closing-body"><small>REQUESTED RANGE</small><strong>12.4 KB</strong><p>Manifest resolved · Shelby blob retained</p><button>Open preview</button></div><div className="ref-closing-bottom"><span>Catalog</span><span>Ranges</span><span>Publish</span></div></div>; }
export function DepartmentCards() { return <div className="ref-departments">{['AI-ready','Web3','Research','Agent logs'].map((x,i)=><article key={x}><span className={`ref-avatar ref-avatar-${i}`}>{i+1}</span><strong>{x}</strong><p>{i===0?'Prompt corpora':i===1?'Chain snapshots':i===2?'Structured tables':'Benchmark traces'}</p><small><i/> range-ready</small></article>)}</div>; }
