import { Link } from 'react-router-dom';

export const DefaultFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div>
      <footer className="ml-1 text-sm mb-10">

        {/* Video tutorial */}
        <p>
          View the tutorial video{' '}
          <a
            href="https://youtu.be/3yqNRygKRH8"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-600"
          >
            here
          </a>.
        </p>
        
        {/* Report problem line */}
        <p>
          Report a problem{' '}
          <Link
            to="/problem"
            className="underline hover:text-blue-600"
          >
            here
          </Link>.
        </p>

        {/* Blank line */}
        <p>&nbsp;</p>

        {/* Copyright */}
        <p>
          &copy; {currentYear} ProgSpanLrn. All rights reserved v2.1
        </p>

        <p>
          Words used on this site are from{' '}
          <a
            href="https://creativecommons.org/publicdomain/zero/1.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-600"
          >
            Creative Commons Zero (CC0) v1.0
          </a>.
        </p>

      </footer>
    </div>
  );
};