import { Link } from '../lib/Link';

export default function NotFoundPage() {
    return (
        <div className="page page-message">
            <p className="page-message-code mono">404</p>
            <h1>This page skipped a beat</h1>
            <p>The link may be broken, or the pack may have been retired.</p>
            <Link to="/" className="btn btn--primary">
                Back to the game
            </Link>
        </div>
    );
}
