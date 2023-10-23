// @ts-ignore
import {core} from '@playkit-js/kaltura-player-js';
import {mockKalturaBe, loadPlayer, MANIFEST, MANIFEST_SAFARI} from './env';

const {FakeEvent} = core;

Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});

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
    it('should not render the plugin button and side panel if visible configuration is false', () => {
      mockKalturaBe();
      loadPlayer({visible: false}, {muted: true, autoplay: true}).then(() => {
        cy.get('[data-testid="navigation_pluginButton"]').should('not.exist');
        cy.get('[data-testid="navigation_root"]').should('not.exist');
      });
    });
  });

  describe('navigation data', () => {
    it('should test fetch of slides and chapters image', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(() => {
        cy.get('@getSlidesAndChapters.all').should('have.length', 2);
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

    it('should only render non default thumbnails', () => {
      mockKalturaBe('vod-entry.json', 'chapters-default-thumbnails.json');
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(() => {
        cy.get('[data-testid="navigation_root"]').should('have.css', 'visibility', 'visible');
        cy.get('[data-testid="navigation_root"]').within(() => {
          cy.get('[data-entry-id="1_02sihd5j"]')
            .children()
            .last()
            .within(() => cy.get('img').should('not.exist'));
          cy.get('[data-entry-id="1_0h1uf07a"]')
            .children()
            .last()
            .within(() => cy.get('img').should('exist'));
        });
      });
    });

    it('should fetch 1 chapter image out of 2', () => {
      mockKalturaBe('vod-entry.json', 'chapters-default-thumbnails.json');
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(() => {
        cy.get('@getSlidesAndChapters.all').should('have.length', 1);
      });
    });

    it('should render capitons without html tags', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(() => {
        cy.get('[data-testid="navigation_root"]').within(() => {
          const searchInput = cy.get("[aria-label='Search in video']");
          searchInput.type('Dark');
          cy.get("[aria-label='Dark Side.']").should('not.contain.text', '<i>');
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

  describe('search result and screen reader wrapper', () => {
    it('should test screen reader wrapper', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(() => {
        cy.get('[data-testid="navigation_root"]').should('have.css', 'visibility', 'visible');
        const screenReaderWrapper = cy.get('[data-testid="screenReaderWrapper"]');
        screenReaderWrapper.should('exist');
        const searchInput = cy.get("[aria-label='Search in video']");
        searchInput.type('ocean');

        // no results
        cy.get('[data-testid="screenReaderWrapper"]')
          .children()
          .should($div => {
            expect($div.text()).to.eq('No Results Found. Try a more general keyword');
          });

        // clear search input
        const clearSearchButton = cy.get("[aria-label='Clear search']");
        clearSearchButton.should('be.visible');
        clearSearchButton.click();
        cy.get('[data-testid="screenReaderWrapper"]')
          .children()
          .should($div => {
            expect($div.text()).to.eq('');
          });

        // 1 result
        searchInput.type('1');
        cy.get('[data-testid="screenReaderWrapper"]')
          .children()
          .should($div => {
            expect($div.text()).to.eq('1 result in all content');
          });
      });
    });
    it('should test search result', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(() => {
        cy.get('[data-testid="navigation_root"]').should('have.css', 'visibility', 'visible');
        cy.get('[data-testid="navigation_root"]').within(() => {
          cy.get('[data-testid="navigation_searchResult"]').should('not.exist');
          const searchInput = cy.get("[aria-label='Search in video']");
          searchInput.type('1');
          cy.get('[data-testid="navigation_list"]').children().should('have.length', 1);

          // 1 result
          cy.get('[data-testid="navigation_searchResult"]').should('exist');
          cy.get('[data-testid="navigation_searchResult"]').should('be.visible');
          cy.get('[data-testid="navigation_searchResult"]').should($div => {
            expect($div.text()).to.eq('1 result in all content');
          });

          // clear search input
          const clearSearchButton = cy.get("[aria-label='Clear search']");
          clearSearchButton.should('be.visible');
          clearSearchButton.click();
          cy.get('[data-testid="navigation_searchResult"]').should('not.exist');

          // no results
          searchInput.type('ocean');
          cy.get('[data-testid="navigation_searchResult"]').should('not.exist');
        });
      });
    });
    it('should test search result in Chapters tab', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(() => {
        cy.get('[data-testid="navigation_root"]').should('have.css', 'visibility', 'visible');
        const screenReaderWrapper = cy.get('[data-testid="screenReaderWrapper"]');
        screenReaderWrapper.should('exist');
        cy.get('[data-testid="navigation_root"]').within(() => {
          const tabChapters = cy.get("[aria-label='List Chapters']").should('be.visible').should('have.attr', 'aria-checked', 'false');
          tabChapters.click();
          tabChapters.should('have.attr', 'aria-checked', 'true');
          const searchInput = cy.get("[aria-label='Search in video']");
          searchInput.type('c');
          cy.get('[data-testid="navigation_list"]').children().should('have.length', 3);
          screenReaderWrapper.children().should($div => {
            expect($div.text()).to.eq('3 results in chapters');
          });
        });
      });
    });
  });

  describe('navigation data with quiz', () => {
    it('should render quiz question items in navigation side panel', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(kalturaPlayer => {
        kalturaPlayer.dispatchEvent(
          new FakeEvent('QuizQuestionChanged', {
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
          })
        );
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
        kalturaPlayer.dispatchEvent(
          new FakeEvent('QuizQuestionChanged', {
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
          })
        );
        cy.get('[data-testid="navigation_questionStateLabel"]')
          .should('exist')
          .should($div => {
            expect($div.text()).to.eq('Answered');
          });
      });
    });
    it('should render a quiz item in the side panel, only after it reached the quiz cuepoint startTime', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(kalturaPlayer => {
        cy.get('[data-testid="navigation_list"]').children().should('have.length', 6);
        const timeout = setTimeout(() => {
          kalturaPlayer.dispatchEvent(
            new FakeEvent('QuizQuestionChanged', {
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
            })
          );
          cy.get('[data-testid="navigation_list"]').children().should('have.length', 7);
        }, 500);
        clearTimeout(timeout);
      });
    });
    it('should indicate that a question is correct', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(kalturaPlayer => {
        kalturaPlayer.dispatchEvent(
          new FakeEvent('QuizQuestionChanged', {
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
          })
        );
        cy.get('[data-testid="navigation_questionStateLabel"]')
          .should('exist')
          .should($div => {
            expect($div.text()).to.eq('Correct');
          });
      });
    });
    it('should indicate that a question is incorrect', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(kalturaPlayer => {
        kalturaPlayer.dispatchEvent(
          new FakeEvent('QuizQuestionChanged', {
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
          })
        );
        cy.get('[data-testid="navigation_questionStateLabel"]')
          .should('exist')
          .should($div => {
            expect($div.text()).to.eq('Incorrect');
          });
      });
    });
    it('should set the question title to Reflection point', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(kalturaPlayer => {
        kalturaPlayer.dispatchEvent(
          new FakeEvent('QuizQuestionChanged', {
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
          })
        );
        cy.get('[data-testid="navigation_questionTitle"]')
          .should('be.visible')
          .should($div => {
            expect($div.text()).to.eq('Reflection point 1');
          });
      });
    });
    it('should set the question title to Question', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(kalturaPlayer => {
        kalturaPlayer.dispatchEvent(
          new FakeEvent('QuizQuestionChanged', {
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
          })
        );
        cy.get('[data-testid="navigation_questionTitle"]')
          .should('be.visible')
          .should($div => {
            expect($div.text()).to.eq('Question 1');
          });
      });
    });
    it('should trigger custom onClick event for quiz cues', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: true}, {muted: true, autoplay: true}).then(kalturaPlayer => {
        const onClick = cy.spy();
        kalturaPlayer.dispatchEvent(
          new FakeEvent('QuizQuestionChanged', {
            qqa: [
              {
                id: '1_6zqqj2e6',
                index: 0,
                type: 1,
                question: 'Quiz cue',
                startTime: 10.647,
                state: 1,
                onClick
              }
            ]
          })
        );
        cy.get('[aria-label="Quiz cue"]')
          .click({force: true})
          .then(() => {
            expect(onClick).to.have.been.calledOnce;
          });
      });
    });
  });
});
