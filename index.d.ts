declare module 'epubjs-rn' {
  import React from 'react';

  interface Props {
    style?: object;
    src?: string;
    flow?: 'paginated' | 'scrolled';
    location?: string;
    onLocationChange?(): void;
    onLocationsReady?(): void;
    onViewAdded?(): void;
    beforeViewRemoved?(): void;
    width: number;
    height: number;
    onReady?(): void;
    themes?: object;
    theme?: string;
    fontSize?: number;
    font?: string;
    stylesheet?: string;
    script?: string;
    minSpreadWidth?: number;
    gap?: number;
    onPress?(ev: object): void;
    onDlbPress?(ev: object): void;
    onLongPress?(ev: object): void;
    onSelected?(ev: object): void;
  }

  export class Epub extends React.Component<Props> {}

  export class Streamer {
    start(port: string): Promise<object>;

    stop(): void;

    kill(): void;

    add(url: string): void;

    check(url: string): Promise<boolean>;
    get(url: string): void;
  }
}
