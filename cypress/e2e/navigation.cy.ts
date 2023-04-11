// @ts-ignore
import {core, KalturaPlayer} from 'kaltura-player-js';

const {FakeEvent} = core;
const MANIFEST = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="en",NAME="English",AUTOSELECT=YES,DEFAULT=YES,URI="${location.origin}/media/index_1.m3u8",SUBTITLES="subs"
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=509496,RESOLUTION=480x272,AUDIO="audio",SUBTITLES="subs"
${location.origin}/media/index.m3u8`;

const MANIFEST_SAFARI = `#EXTM3U
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",DEFAULT=NO,AUTOSELECT=YES,FORCED=NO,LANGUAGE="en",URI="${location.origin}/media/index_1.m3u8"
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=504265,RESOLUTION=480x272,AUDIO="audio",SUBTITLES="subs"
${location.origin}/media/index.m3u8`;

const getPlayer = () => {
  // @ts-ignore
  return cy.window().then($win => $win.KalturaPlayer.getPlayers()['player-placeholder']);
};

const preparePage = (navigationConf: Object, playbackConf: Object) => {
  cy.visit('index.html');
  return cy.window().then(win => {
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
      return kalturaPlayer.loadMedia({entryId: '0_wifqaipd'});
    } catch (e: any) {
      return Promise.reject(e.message);
    }
  });
};

const loadPlayer = (navigationConf = {}, playbackConf = {}) => {
  return preparePage(navigationConf, playbackConf).then(() => getPlayer().then(kalturaPlayer => kalturaPlayer.ready().then(() => kalturaPlayer)));
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
    cy.intercept('GET', '**/a.m3u8*', Cypress.browser.name === 'webkit' ? MANIFEST_SAFARI : MANIFEST);
    // thumbnails
    cy.intercept('GET', '**/width/164/vid_slices/100', {fixture: '100.jpeg'});
    cy.intercept('GET', '**/height/360/width/640', {fixture: '640.jpeg'});
    // kava
    cy.intercept('GET', '**/index.php?service=analytics*', {});
  });

  describe('plugin button and panel', () => {
    it('should open then close the navigation side panel', () => {
      mockKalturaBe();
      loadPlayer().then(() => {
        cy.get('[data-testid="navigation_pluginButton"]').should('exist');
        cy.get('[data-testid="navigation_pluginButton"]').click({force: true});
        cy.get('[data-testid="navigation_root"]').should('exist');
        cy.get('[data-testid="navigation_root"]').should('have.css', 'visibility', 'visible');
        cy.get('[data-testid="navigation_closeButton"]').click({force: true});
        cy.get('[data-testid="navigation_root"]').should('have.css', 'visibility', 'hidden');
      });
    });
    it('should open the navigation side panel if expandOnFirstPlay configuration is true', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(() => {
        cy.get('[data-testid="navigation_pluginButton"]').should('exist');
        cy.get('[data-testid="navigation_root"]').should('have.css', 'visibility', 'visible');
      });
    });
    it('should close plugin if ESC button pressed', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(() => {
        cy.get("[aria-label='Search in video']").should('be.visible');
        cy.get("[aria-label='Search in video']").type('{esc}');
        cy.get('[data-testid="navigation_root"]').should('have.css', 'visibility', 'hidden');
      });
    });
  });

  describe('navigation data', () => {
    it('should test fetch of slides and chapters image', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(() => {
        cy.get('@getChapters.all').should('have.length', 3);
        cy.get('@getSlides.all').should('have.length', 2);
      });
    });

    it('should render navigation items', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(() => {
        cy.get('[data-testid="navigation_root"]').within(() => {
          cy.get('[data-testid="navigation_list"]').children().should('have.length', 6);
        });
      });
    });

    it('should handle click and make seek to cue startTime', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(() => {
        cy.get('[data-testid="navigation_root"]').should('have.css', 'visibility', 'visible');
        cy.get('[data-testid="navigation_root"]').within(() => {
          const chapterItem = cy.get('[aria-label="chapter 2"]').should('have.attr', 'aria-current', 'false');
          chapterItem.click({force: true});
          chapterItem.should('have.attr', 'aria-current', 'true');
        });
      });
    });

    it('should highlight navigation item when playback reach cue startTime', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(kalturaPlayer => {
        cy.get('[data-testid="navigation_root"]').should('have.css', 'visibility', 'visible');
        cy.get('[data-testid="navigation_root"]').within(() => {
          cy.get('[aria-label="Hotspot 1"]').should('have.attr', 'aria-current', 'false');
          kalturaPlayer.currentTime = 12;
          cy.get('[aria-label="Hotspot 1"]').should('have.attr', 'aria-current', 'true');
        });
      });
    });

    it('should highlight different type of navigation items according to playback ', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(kalturaPlayer => {
        cy.get('[data-testid="navigation_root"]').should('have.css', 'visibility', 'visible');
        cy.get('[data-testid="navigation_root"]').within(() => {
          cy.get('[data-entry-id="1_02sihd5j"]').should('have.attr', 'aria-current', 'false');
          cy.get("[aria-label='Search in video']").type('c');
          kalturaPlayer.currentTime = 12;
          cy.get('[data-entry-id="1_nkiuwh50-1"]').should('have.attr', 'aria-current', 'true');
          cy.get("[aria-label='List Chapters']").click();
          cy.get('[data-entry-id="1_02sihd5j"]').should('have.attr', 'aria-current', 'true');
        });
      });
    });
  });

  describe('search and filter', () => {
    it('should set focus to search input if plugin opened by keyboard', () => {
      mockKalturaBe();
      loadPlayer().then(() => {
        cy.get('[data-testid="navigation_pluginButton"]').should('exist').trigger('keydown', {
          keyCode: 32, // Space
          force: true
        });
        cy.get("[aria-label='Search in video']").should('have.focus');
      });
    });
    it('should test search bar', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(() => {
        cy.get('[data-testid="navigation_root"]').should('have.css', 'visibility', 'visible');
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
    });
    it('should test filter tabs', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(() => {
        cy.get('[data-testid="navigation_root"]').should('have.css', 'visibility', 'visible');
        cy.get('[data-testid="navigation_root"]').within(() => {
          // default state
          const tabAll = cy.get("[aria-label='List All']").should('be.visible').should('have.attr', 'aria-checked', 'true');
          const tabChapters = cy.get("[aria-label='List Chapters']").should('be.visible').should('have.attr', 'aria-checked', 'false');
          const tabSlides = cy.get("[aria-label='List Slides']").should('be.visible').should('have.attr', 'aria-checked', 'false');
          const tabHotspots = cy.get("[aria-label='List Hotspots']").should('be.visible').should('have.attr', 'aria-checked', 'false');
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
          cy.get("[aria-label='List All']").should('be.visible');
          cy.get("[aria-label='List Chapters']").should('be.visible');
          cy.get("[aria-label='Slides']").should('not.exist');
          cy.get("[aria-label='Hotspots']").should('not.exist');
          cy.get("[aria-label='AoA']").should('not.exist');
          const tabCaptions = cy.get("[aria-label='List Captions']").should('be.visible').click();
          tabCaptions.should('have.attr', 'aria-checked', 'true');
          cy.get('[data-testid="navigation_list"]').children().should('have.length', 5);
        });
      });
    });
  });

  describe('navigation data with quiz', () => {
    it('should render quiz question items in navigation side panel', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(kalturaPlayer => {
        kalturaPlayer.dispatchEvent(new FakeEvent('QuizQuestionChanged', {
          qqa: [
            {
              id: '1_6zqqj2e6',
              index: 0,
              type: 3,
              question: 'Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui.',
              startTime: 10.647,
              state: 1
            }
          ]
        }));
        cy.get('[data-testid="navigation_root"]').within(() => {
          cy.get('[data-testid="navigation_list"]').children().should('have.length', 7);
        });
        const tabQuestions = cy.get("[aria-label='List Questions']").should('be.visible').should('have.attr', 'aria-checked', 'false');
        tabQuestions.click();
        cy.get('[data-testid="navigation_list"]').children().should('have.length', 1);
      });
    });
    it('should indicate that a question has been answered', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(kalturaPlayer => {
        kalturaPlayer.dispatchEvent(new FakeEvent('QuizQuestionChanged', {
          qqa: [
            {
              id: '1_6zqqj2e6',
              index: 0,
              type: 3,
              question: 'Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui.',
              startTime: 10.647,
              state: 2
            }
          ]
        }));
        cy.get('[data-testid="navigation_questionStateLabel"]').should('be.visible');
        cy.get('[data-testid="navigation_questionStateLabel"]').should($div => {
          expect($div.text()).to.eq('Answered');
        });
      });
    });
    it('should render a quiz item in the side panel, only after it reached the quiz cuepoint startTime', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(kalturaPlayer => {
        cy.get('[data-testid="navigation_list"]').children().should('have.length', 6);
        const timeout = setTimeout(() => {
          kalturaPlayer.dispatchEvent(new FakeEvent('QuizQuestionChanged', {
            qqa: [
              {
                id: '1_6zqqj2e6',
                index: 0,
                type: 3,
                question: 'Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui.',
                startTime: 10.647,
                state: 2
              }
            ]
          }));
          cy.get('[data-testid="navigation_list"]').children().should('have.length', 7);
        }, 500);
        clearTimeout(timeout);
      });
    });
    it('should indicate that a question is correct', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(kalturaPlayer => {
        kalturaPlayer.dispatchEvent(new FakeEvent('QuizQuestionChanged', {
          qqa: [
            {
              id: '1_6zqqj2e6',
              index: 0,
              type: 3,
              question: 'Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui.',
              startTime: 10.647,
              state: 4
            }
          ]
        }));
        cy.get('[data-testid="navigation_questionStateLabel"]').should('be.visible').should($div => {
          expect($div.text()).to.eq('Correct');
        });
      });
    });
    it('should indicate that a question is incorrect', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(kalturaPlayer => {
        kalturaPlayer.dispatchEvent(new FakeEvent('QuizQuestionChanged', {
          qqa: [
            {
              id: '1_6zqqj2e6',
              index: 0,
              type: 3,
              question: 'Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui.',
              startTime: 10.647,
              state: 3
            }
          ]
        }));
        cy.get('[data-testid="navigation_questionStateLabel"]').should('be.visible').should($div => {
          expect($div.text()).to.eq('Incorrect');
        });
      });
    });
    it('should set the question title to Reflection point', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(kalturaPlayer => {
        kalturaPlayer.dispatchEvent(new FakeEvent('QuizQuestionChanged', {
          qqa: [
            {
              id: '1_6zqqj2e6',
              index: 0,
              type: 3,
              question: 'Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui.',
              startTime: 10.647,
              state: 1
            }
          ]
        }));
        cy.get('[data-testid="navigation_questionTitle"]').should('be.visible').should($div => {
          expect($div.text()).to.eq('Reflection point 1');
        });
      });
    });
    it('should set the question title to Question', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(kalturaPlayer => {
        kalturaPlayer.dispatchEvent(new FakeEvent('QuizQuestionChanged', {
          qqa: [
            {
              id: '1_6zqqj2e6',
              index: 0,
              type: 1,
              question: 'Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui.',
              startTime: 10.647,
              state: 1
            }
          ]
        }));
        cy.get('[data-testid="navigation_questionTitle"]').should('be.visible').should($div => {
          expect($div.text()).to.eq('Question 1');
        });
      });
    });
  });
});
