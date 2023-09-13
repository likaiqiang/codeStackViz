import { Html, Main, NextScript, Head } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
        <Head>
            <script type='module' dangerouslySetInnerHTML={{ __html:
                    `
                        import babelParser from 'https://cdn.jsdelivr.net/npm/@babel/parser@7.22.16/+esm';
                        window.babelParser = babelParser;
                    `
            }} />
        </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
