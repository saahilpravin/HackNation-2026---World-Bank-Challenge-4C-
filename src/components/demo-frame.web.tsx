import type { ReactNode } from "react";
export function DemoFrame({ children }: { children: ReactNode }) {
  return <div className="demo-stage"><style>{`
    html, body, #root { height: 100%; overflow: hidden; }
    .demo-stage { height: 100dvh; width: 100%; display: flex; align-items: center; justify-content: center; background: radial-gradient(ellipse at 25% 15%, #eee7fa, transparent 60%), #f5f2ec; }
    .demo-phone { width: 390px; height: min(844px, calc(100dvh - 48px)); display: flex; flex-direction: column; position: relative; overflow: hidden; border: 8px solid #242131; border-radius: 44px; background: #fff; box-shadow: 0 28px 65px #30225124, 0 0 0 1px #ffffff; }
    .demo-status { height: 29px; flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; font: 600 11px system-ui; color: #242131; background: white; }
    .demo-camera { position: absolute; left: 50%; transform: translateX(-50%); top: 7px; width: 86px; height: 19px; border-radius: 14px; background: #242131; }
    .demo-content { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
    .demo-content > div { flex: 1; min-height: 0; }
    .demo-home { height: 13px; flex-shrink: 0; display: flex; justify-content: center; background: white; }
    .demo-home:after { content: ''; height: 4px; width: 100px; border-radius: 4px; background: #242131; margin-top: 3px; }
    @media(max-width: 480px) { .demo-stage { background: white; } .demo-phone { width: 100%; height: 100dvh; border: 0; border-radius: 0; box-shadow: none; } .demo-status, .demo-home { display: none; } }
  `}</style><div className="demo-phone"><div className="demo-status" aria-hidden="true"><span>9:41</span><span className="demo-camera"/><span>▮▮▮ ▰</span></div><div className="demo-content">{children}</div><div className="demo-home" aria-hidden="true"/></div></div>;
}
