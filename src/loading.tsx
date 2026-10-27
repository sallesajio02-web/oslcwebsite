export function BrandLoading({label="Loading website..."}:{label?:string}) {
 return <div className="brand-loading" role="status" aria-live="polite" aria-busy="true" aria-label={label}><img src="/brand/oslc-logo.webp" alt="OSLC - Om Sai Latest Creation" width={280} height={140} fetchPriority="high"/><div className="brand-loading-track" aria-hidden="true"><span/></div></div>;
}
