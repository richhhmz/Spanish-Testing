export const DefaultFooter = () => {
    const currentYear = new Date().getFullYear();

    return (
        <div>
            <footer className="ml-1 text-sm mb-10">
                <p>&nbsp;</p>
                <p>
                    &copy; {currentYear} ProgSpanLrn. All rights reserved v1.2
                </p>
                <p>
                    Words used on this site are from{' '}
                    <a href="https://creativecommons.org/publicdomain/zero/1.0/">
                        Creative Commons Zero (CC0) v1.0
                    </a>.
                </p>
            </footer>
        </div>
    );
};
