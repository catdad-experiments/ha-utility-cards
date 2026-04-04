# Home Assistant utility cards

![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/catdad-experiments/ha-utility-cards/total)

This is a bunch of Home Assisatant Lovelace cards that enhance other cards or dashboard functionality. All cards include a visual editor so you can easily add them.

## Installation

In HACS, add the repo `https://github.com/catdad-experiments/ha-utility-cards` and select "Dashboard" for the type. Then search for "Catdad Unility Cards" and download it. You are done!

## Cards

* [`combined-card`](#combined-card)
* [`kiosk-card`](#kiosk-card)
* [`catdad-auto-reload-card`](#auto-reload-card)
* [`catdad-back-button-card`](#back-button-card)
* [`catdad-auto-light-dark-mode-card`](#automatic-lightdark-mode-card)
* [`catdad-homepage-card`](#homepage-card)

## Combined Card

A card that seemlessly combines any stack of cards into a single card.

It was heavily inspired by [`stack-in-card`](https://github.com/custom-cards/stack-in-card), but takes a completely different approach to combining the cards. On top of that, it has a visual editor, allowing you to fully create your combined card from the UI. You can nest cards inside a combined card as deep as you'd like (i.e. use vertical and horizontal stacks as you see fit) without performance issues and without re-introducing borders and shadows inside the nested stacks.

Here is a stack of cards created using [mushroom cards](https://github.com/piitaya/lovelace-mushroom).

![default cards](https://github.com/catdad-experiments/ha-combined-card/assets/2205537/7df801ea-6ebe-4f61-9b5f-1dc2683f2a74)

This stack looks pretty nice on its own, but can become chaotic inside a dashboard with even more cards.

With `combined-card`, that entire stack can be placed inside a single card, giving it a better group look.

![combined in single stack](https://github.com/catdad-experiments/ha-combined-card/assets/2205537/e7423047-8e49-4fa1-a8c7-22379ef81039)

If this is too undefined for you, you can combine the cards more granularly, in this example into a porch card and a backyard card.

![combined in two groups](https://github.com/catdad-experiments/ha-combined-card/assets/2205537/d8691dd0-e89b-4772-b024-d887670ce365)

## Kiosk Card

A card that will hide the dashboard header bar. I recommend using it with something like [`navbar-card`](https://github.com/joseluis9595/lovelace-navbar-card) so that you can still navigate around your dashboard.

This card will only work if it is rendered. This means that you can use Home Assistant's built-in visibility tab to add rules for when the card is rendered (e.g. for specific users, at specific times, as a result of specific states, etc.).

## Auto Reload Card

This card monitors your dashboard and automatically reloads it if:
* it detects that dashboard entities are no longer updates (i.e. the dashboard has become disconnected from the server)
* it detects and recovers from a network outage (i.e. I restart my wifi on a timer every night)
* it detects that there is a dashboard update (you no longer have to walk around your house and hit the "Refresh" button when you make an update to wallpanels!)

By default, this card does not render anything on the dashboard, though you can enable debug mode to see a record of what this card has detected and recovered from.

## Back Button Card

This card is a button that navigates back in the browser -- acts just like clicking your browser's back button or swiping back on Android, except as a card on any dashboard usable on any device. You can use Home Assistant's built-in visibility settings to control when the card is rendered.

<img width="248" height="71" alt="image" src="https://github.com/user-attachments/assets/02c75464-206b-440b-9ef4-666f3e96b19a" />

You can customize the icon and text on this card through the visual editor.

## Automatic Light/Dark Mode Card

This card can automatically switch your dashboard between light and dark mode based on a template string (think monitoring a lux sensor on a wallpanel). You can use Home Assistant's built-in visibility settings to control when the card has effect.

You can optionally also use it for manual control:

<img width="364" height="106" alt="image" src="https://github.com/user-attachments/assets/7dbd1ddf-cf30-486f-8c11-6a49fb93fcc1" />

## Homepage Card

When this card is placed on a dashboard, that dashboard becomes the "homepage". If you navigate away and leave the page idle for a while, this card will make sure to navigate back to the homepage. You can combine it with the built-in visibility settings to control when the card has effect.

I use this on my wall panel to make sure it always goes back to the default page after someone walks away.

## Notifications Card

<img width="515" height="279" alt="image" src="https://github.com/user-attachments/assets/08dd64cc-c8bc-4391-b6aa-cd3d93a7010b" />

This card is used to bring [persistent notifications](https://www.home-assistant.io/integrations/persistent_notification/) onto your dashboards. It's inspired by the [home feed card](https://github.com/gadgetchnnel/lovelace-home-feed-card), it focuses more on design and ease of use.

All persisted notifications will be shown on the card, with an optional button to dismiss the notification. However, you can also configure the notifications further when creating them. You have the following properties:

* `level` - The alert level of the notification. All this does really is just change the color. You have the following options:
  * `success` - green
  * `error` - red
  * `warning` - yellow
  * `info` - blue
  * `neutral` - the same as not including level at all, so not really sure why I added this option
* `color` - Any custom color you want to use. This overrides `level` in case you include both for some reason. Use a hex color (`#bada55`) or a named color (`purple`).
* `icon` - Any icon you can use in other Home Assistant cards, entities, etc. (`mdi:hand-wave`)

These are all defined through the `notification_id` of the persisted notification -- unfortuantely, this is the only value that Home Assistant exposes for persisted notifications, so we have to hack it. All properties are defined as a [query string](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams) (sorry for the non-nerds out there, just look at the example and know that I believe in you!). Since `notification_id` is evaluated for uniqueness in order to clear or replace notifications, you also need to make sure that the final value you provide is unique -- again, see the examples.

### Example notification from developer tools

```yaml
action: notify.persistent_notification
data:
  message: Hey, look over here
  data:
    notification_id: color=bada55&icon=mdi:hand-wave&id={{ range(100000) | random }}
```

### Exampe notification from an automation

```yaml
action: persistent_notification.create
data:
  message: Laundry is done at {{ now().strftime("%I:%M %p") }}
  notification_id: level=info&icon=mdi:washing-machine&id={{ range(100000) | random }}
```
