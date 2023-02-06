const MANIFEST = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="en",NAME="English",AUTOSELECT=YES,DEFAULT=YES,URI="${location.origin}/media/index_1.m3u8",SUBTITLES="subs"

#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=509496,RESOLUTION=480x272,AUDIO="audio",SUBTITLES="subs"
${location.origin}/media/index.m3u8`;

const preparePage = (navigationConf = {}, playbackConf = {}) => {
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
        playback: {muted: true, autoplay: true, ...playbackConf}
      });
      kalturaPlayer.loadMedia({entryId: '0_wifqaipd'});
    } catch (e: any) {
      console.error(e.message);
    }
  });
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

const mockKalturaBe = (entryFixture = 'vod-entry.json', dataFixture = 'navigation-data.json', captionsFixture = 'captions-en-response.json') => {
  cy.intercept('http://mock-api/service/multirequest', req => {
    if (checkRequest(req.body[2], 'baseEntry', 'list')) {
      return req.reply({fixture: entryFixture});
    }
    if (checkRequest(req.body[2], 'cuepoint_cuepoint', 'list')) {
      return req.reply({fixture: dataFixture});
    }
    if (checkRequest(req.body[2], 'caption_captionasset', 'serveAsJson')) {
      return req.reply({fixture: captionsFixture});
    }
    if (checkRequest(req.body[2], 'thumbAsset', 'getUrl')) {
      return req.reply({fixture: 'thumb-url.json'});
    }
  });
  cy.intercept('GET', '**/ks/123', {fixture: 'thumb-asset.jpeg'}).as('getSlides');
  cy.intercept('GET', '**/vid_sec/*', {fixture: 'thumb-asset.jpeg'}).as('getChapters');
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

  describe('plugin button and panel', () => {
    it('should open then close the navigation side panel', () => {
      mockKalturaBe();
      preparePage();
      clickNavigationPluginButton();
      cy.get('[data-testid="navigation_root"]').should('exist');
      cy.get('[data-testid="navigation_root"]').should('have.css', 'visibility', 'visible');
      clickClosePluginButton();
      cy.get('[data-testid="navigation_root"]').should('have.css', 'visibility', 'hidden');
    });

    it('should open the navigation side panel if expandOnFirstPlay configuration is true ', () => {
      mockKalturaBe();
      preparePage({expandOnFirstPlay: true}, {muted: true, autoplay: true});
      cy.get('[data-testid="navigation_pluginButton"]').should('exist');
      cy.get('[data-testid="navigation_root"]').should('have.css', 'visibility', 'visible');
    });
  });

  describe('navigation data', () => {
    it('should test fetch of slides and chapters image', () => {
      mockKalturaBe();
      preparePage({expandOnFirstPlay: true}, {muted: true, autoplay: true});
      cy.get('@getChapters.all').should('have.length', 3);
      cy.get('@getSlides.all').should('have.length', 2);
    });

    it('should render navigation items', () => {
      mockKalturaBe();
      preparePage({expandOnFirstPlay: true}, {muted: true, autoplay: true});
      cy.get('[data-testid="navigation_root"]').within(() => {
        cy.get('[data-testid="navigation_list"]').children().should('have.length', 6);
      });
    });

    it('should handle click and make seek to cue startTime', () => {
      mockKalturaBe();
      preparePage({expandOnFirstPlay: true}, {muted: true, autoplay: true});
      cy.window().then($win => {
        // @ts-ignore
        const kalturaPlayer = $win.KalturaPlayer.getPlayers()['player-placeholder'];
        cy.get('[data-testid="navigation_root"]').within(() => {
          kalturaPlayer.pause();
          const chapterItem = cy.get('[area-label="chapter 2"]').should('have.attr', 'aria-current', 'false');
          chapterItem.click();
          chapterItem.should('have.attr', 'aria-current', 'true').then(() => {
            expect(kalturaPlayer.currentTime).to.eql(20);
          });
        });
      });
    });

    it('should highlight navigation item when playback reach cue startTime', () => {
      mockKalturaBe();
      preparePage({expandOnFirstPlay: true}, {muted: true, autoplay: true});
      cy.window().then($win => {
        // @ts-ignore
        const kalturaPlayer = $win.KalturaPlayer.getPlayers()['player-placeholder'];
        cy.get('[data-testid="navigation_root"]').within(() => {
          cy.get('[area-label="Hotspot 1"]').should('have.attr', 'aria-current', 'false');
          kalturaPlayer.currentTime = 12;
          cy.get('[area-label="Hotspot 1"]').should('have.attr', 'aria-current', 'true');
        });
      });
    });

    it('should highlight different type of navigation items according to playback ', () => {
      mockKalturaBe();
      preparePage({expandOnFirstPlay: true}, {muted: true, autoplay: true});
      cy.window().then($win => {
        // @ts-ignore
        const kalturaPlayer = $win.KalturaPlayer.getPlayers()['player-placeholder'];
        cy.get('[data-testid="navigation_root"]').within(() => {
          cy.get('[data-entry-id="1_02sihd5j"]').should('have.attr', 'aria-current', 'false');
          cy.get("[aria-label='Search in video']").type('c');
          kalturaPlayer.currentTime = 12;
          cy.get('[data-entry-id="1_nkiuwh50-1"]').should('have.attr', 'aria-current', 'true');
          cy.get("[aria-label='Chapters']").click();
          cy.get('[data-entry-id="1_02sihd5j"]').should('have.attr', 'aria-current', 'true');
        });
      });
    });
  });

  describe('search and filter', () => {
    it('should test search bar', () => {
      mockKalturaBe();
      preparePage({expandOnFirstPlay: true}, {muted: true, autoplay: true});
      cy.get('[data-testid="navigation_root"]').within(() => {
        const searchInput = cy.get("[aria-label='Search in video']");
        searchInput.should('be.visible');
        searchInput.type('1');
        searchInput.should('have.value', '1');
        cy.get('[data-testid="navigation_list"]').children().should('have.length', 1);
        const clearSearchButton = cy.get("[aria-label='Clear search']");
        clearSearchButton.should('be.visible');
        clearSearchButton.click();
        searchInput.should('have.value', '');
        cy.get('[data-testid="navigation_list"]').children().should('have.length', 6);
      });
    });
    it('should test filter tabs', () => {
      mockKalturaBe();
      preparePage({expandOnFirstPlay: true}, {muted: true, autoplay: true});
      cy.get('[data-testid="navigation_root"]').within(() => {
        // default state
        const tabAll = cy.get("[aria-label='All']").should('be.visible').should('have.attr', 'aria-checked', 'true');
        const tabChapters = cy.get("[aria-label='Chapters']").should('be.visible').should('have.attr', 'aria-checked', 'false');
        const tabSlides = cy.get("[aria-label='Slides']").should('be.visible').should('have.attr', 'aria-checked', 'false');
        const tabHotspots = cy.get("[aria-label='Hotspots']").should('be.visible').should('have.attr', 'aria-checked', 'false');
        cy.get("[aria-label='Captions']").should('not.exist');
        cy.get("[aria-label='AoA']").should('not.exist');

        // apply filters
        tabChapters.click();
        cy.get('[data-testid="navigation_list"]').children().should('have.length', 3);
        tabSlides.click();
        cy.get('[data-testid="navigation_list"]').children().should('have.length', 2);
        tabHotspots.click();
        cy.get('[data-testid="navigation_list"]').children().should('have.length', 1);
        tabAll.click();
        cy.get('[data-testid="navigation_list"]').children().should('have.length', 6);

        // apply search
        cy.get("[aria-label='Captions']").should('not.exist');
        cy.get("[aria-label='Search in video']").type('c');
        cy.get("[aria-label='All']").should('be.visible');
        cy.get("[aria-label='Chapters']").should('be.visible');
        cy.get("[aria-label='Slides']").should('not.exist');
        cy.get("[aria-label='Hotspots']").should('not.exist');
        cy.get("[aria-label='AoA']").should('not.exist');
        const tabCaptions = cy.get("[aria-label='Captions']").should('be.visible').click();
        tabCaptions.should('have.attr', 'aria-checked', 'true');
        cy.get('[data-testid="navigation_list"]').children().should('have.length', 5);
      });
    });
  });
});
