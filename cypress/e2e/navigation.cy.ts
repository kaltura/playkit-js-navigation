const MANIFEST = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="en",NAME="English",AUTOSELECT=YES,DEFAULT=YES,URI="${location.origin}/media/index_1.m3u8",SUBTITLES="subs"

#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=509496,RESOLUTION=480x272,AUDIO="audio",SUBTITLES="subs"
${location.origin}/media/index.m3u8`;

const preparePage = (navigationConf = {}) => {
  cy.visit('index.html');
  cy.window().then(win => {
    try {
      // @ts-ignore
      var kalturaPlayer = win.KalturaPlayer.setup({
        targetId: 'player-placeholder',
        provider: {
          partnerId: -1,
          env: {
            cdnUrl: 'http://mock-cdn',
            serviceUrl: 'http://mock-api'
          }
        },
        plugins: {
          navigation: navigationConf,
          uiManagers: {},
          kalturaCuepoints: {}
        },
        playback: {
          muted: true
        }
      });
      kalturaPlayer.loadMedia({entryId: '0_wifqaipd'});
    } catch (e: any) {
      console.error(e.message);
    }
  });
};

const initiatePlay = () => {
  cy.get('.playkit-pre-playback-play-button').click({force: true});
};

const clickNavigationPluginButton = () => {
  cy.get('[data-testid="navigation_pluginButton"]').should('exist');
  cy.get('[data-testid="navigation_pluginButton"]').click({force: true});
};

const clickClosePluginButton = () => {
  cy.get('[data-testid="navigation_closeButton"]').should('exist');
  cy.get('[data-testid="navigation_closeButton"]').click({force: true});
};

const checkRequest = (reqBody: any, service: string, action: string) => {
  return reqBody?.service === service && reqBody?.action === action;
};

const mocKalturaBe = (entryFixture = 'vod-with-captions.json', captionsFixture = 'captions-en-response.json') => {
  cy.intercept('http://mock-api/service/multirequest', req => {
    if (checkRequest(req.body[2], 'baseEntry', 'list')) {
      return req.reply({fixture: entryFixture});
    }
    if (checkRequest(req.body[2], 'caption_captionasset', 'serveAsJson')) {
      return req.reply({fixture: captionsFixture});
    }
  });
};

describe('Navigation plugin', () => {
  beforeEach(() => {
    // manifest
    cy.intercept('GET', '**/a.m3u8*', MANIFEST);
    // thumbnails
    cy.intercept('GET', '**/width/164/vid_slices/100', {fixture: '100.jpeg'});
    cy.intercept('GET', '**/height/360/width/640', {fixture: '640.jpeg'});
    // kava
    cy.intercept('GET', '**/index.php?service=analytics*', {});
  });

  describe('navigation', () => {
    it('should not show Navigation plugin button for entry without navigation data', () => {
      mocKalturaBe('vod-without-captions.json');
      preparePage();
      initiatePlay();
      cy.get('[data-testid="transcript_pluginButton"]').should('not.exist');
      cy.get('[data-testid="transcript_printButton"]').should('not.exist');
      cy.get('[data-testid="transcript_downloadButton"]').should('not.exist');
    });

    // it('should open the transcript side panel after clicking on play button', () => {
    //   mockNavigation();
    //   preparePage();
    //   initiatePlay();
    //   cy.get('[data-testid="transcript_root"]').should('exist');
    //   cy.get('[data-testid="transcript_root"]').should('have.css', 'visibility', 'visible');
    // });

    // it('should not open the transcript side panel after clicking on play button', () => {
    //   mockNavigation();
    //   preparePage({expandOnFirstPlay: false});
    //   initiatePlay();
    //   cy.get('[data-testid="transcript_root"]').should('have.css', 'visibility', 'hidden');
    // });

    // it('should open and close Navigation plugin', () => {
    //   mockNavigation();
    //   preparePage({expandOnFirstPlay: false});
    //   initiatePlay();
    //   clickTranscriptPluginButton();
    //   cy.get('[data-testid="transcript_root"]').should('exist');
    //   cy.get('[data-testid="transcript_root"]').should('have.css', 'visibility', 'visible');
    //   clickClosePluginButton();
    //   cy.get('[data-testid="transcript_root"]').should('have.css', 'visibility', 'hidden');
    // });

    // it('should select captions and highlight them', () => {
    //   mockNavigation();
    //   preparePage();
    //   initiatePlay();
    //   cy.window().then(win => {
    //     // @ts-ignore
    //     const kalturaPlayer = win.KalturaPlayer.getPlayers()['player-placeholder'];
    //     const captionSpan = cy.get('[data-testid="transcript_list"] [role="listitem"]').first();
    //     captionSpan.should('exist');
    //     kalturaPlayer.currentTime = 20;
    //     captionSpan.should('have.attr', 'aria-current', 'false');
    //     captionSpan.click();
    //     kalturaPlayer.pause();
    //     captionSpan.should('have.attr', 'aria-current', 'true');
    //   });
    // });
  });

  // describe('search bar', () => {
  //   it('should search for the word "first" and find 2 results', () => {
  //     mockNavigation();
  //     preparePage();
  //     initiatePlay();
  //     cy.get('[data-testid="transcript_header"]').within(() => {
  //       cy.get('[aria-label="Search in Transcript"]').get('input').type('first');
  //       cy.get('[aria-label="Previous"]').should('exist');
  //       cy.get('[aria-label="Next"]').should('exist');
  //       cy.get('[aria-label="Result 1 of 2"]').should('exist');
  //       cy.get('[aria-label="Result 1 of 2"]').should($div => {
  //         expect($div[0].textContent).to.eq('1/2');
  //       });
  //     });
  //   });

  //   it('should highlight search results', () => {
  //     mockNavigation();
  //     preparePage();
  //     initiatePlay();
  //     cy.get('[data-testid="transcript_header"] [aria-label="Search in Transcript"]').get('input').type('first');

  //     cy.get('[data-testid="transcript_list"]')
  //       .contains('listening to music for the first time')
  //       .within(() => cy.get('span[class*="highlight-search"]').should('exist'));

  //     cy.get('[data-testid="transcript_list"]')
  //       .contains('first caption')
  //       .within(() => cy.get('span[class*="highlight-search"]').should('not.exist'));
  //   });

  //   it('should clear the search bar', () => {
  //     mockNavigation();
  //     preparePage();
  //     initiatePlay();
  //     cy.get('[data-testid="transcript_header"]').within(() => {
  //       cy.get('[aria-label="Search in Transcript"]').should('exist');
  //       cy.get('[aria-label="Search in Transcript"]').get('input').type('first');
  //       cy.get('[aria-label="Clear search"]').click();
  //       cy.get('[aria-label="Search in Transcript"]')
  //         .get('input')
  //         .should($div => {
  //           expect($div[0].textContent).to.eq('');
  //         });
  //     });
  //   });
  // });
});
