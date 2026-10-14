export function SetupSkeleton() {
    return (
        <section className="setup page" aria-busy="true" aria-label="Loading">
            <div className="setup-hero">
                <div className="skeleton setup-covers" style={{ aspectRatio: '1' }} />
                <div className="setup-intro">
                    <div className="skeleton" style={{ width: 90, height: 14 }} />
                    <div className="skeleton" style={{ width: '70%', height: 44, marginTop: 14 }} />
                    <div className="skeleton" style={{ width: '90%', height: 18, marginTop: 16 }} />
                </div>
            </div>
            <div className="setup-panel">
                <div className="skeleton" style={{ height: 46, borderRadius: 999 }} />
                <div className="skeleton" style={{ height: 46, borderRadius: 999 }} />
                <div className="skeleton" style={{ height: 52, borderRadius: 999 }} />
            </div>
        </section>
    );
}
