/**
 * Curated set of Tabler icons, statically imported (and thus inlined +
 * tree-shaken at build time by unplugin-icons) rather than resolved
 * dynamically by name: the full Tabler icon set is ~340 KiB gzipped as raw
 * data, far past the app's 100 KiB JS budget (tools/checkBudget.mjs). Names
 * typed into a link/tab's "icon" field that aren't in this list simply
 * render no icon — a known tradeoff of a fully static, offline-first bundle.
 *
 * Covers every icon used in the default config plus a broad set of common
 * ones useful for a personal link dashboard. To add one: `import` it below
 * and add it to `ICON_REGISTRY`.
 */
import type { Component } from 'svelte';

import IconWorld from '~icons/tabler/world';
import IconHome from '~icons/tabler/home';
import IconMail from '~icons/tabler/mail';
import IconClock from '~icons/tabler/clock';
import IconCalendar from '~icons/tabler/calendar';
import IconCalendarEvent from '~icons/tabler/calendar-event';
import IconNews from '~icons/tabler/news';
import IconSearch from '~icons/tabler/search';
import IconStar from '~icons/tabler/star';
import IconHeart from '~icons/tabler/heart';
import IconSettings from '~icons/tabler/settings';
import IconHelp from '~icons/tabler/help';
import IconExternalLink from '~icons/tabler/external-link';
import IconLink from '~icons/tabler/link';
import IconFolder from '~icons/tabler/folder';
import IconBookmark from '~icons/tabler/bookmark';
import IconRss from '~icons/tabler/rss';
import IconCloud from '~icons/tabler/cloud';
import IconSun from '~icons/tabler/sun';
import IconMoon from '~icons/tabler/moon';
import IconDownload from '~icons/tabler/download';
import IconUpload from '~icons/tabler/upload';
import IconDeviceTv from '~icons/tabler/device-tv';
import IconMovie from '~icons/tabler/movie';
import IconMusic from '~icons/tabler/music';
import IconShoppingCart from '~icons/tabler/shopping-cart';
import IconCode from '~icons/tabler/code';
import IconBook from '~icons/tabler/book';
import IconMap from '~icons/tabler/map';
import IconBuildingBank from '~icons/tabler/building-bank';
import IconBrandGithub from '~icons/tabler/brand-github';
import IconBrandGitlab from '~icons/tabler/brand-gitlab';
import IconBrandGoogle from '~icons/tabler/brand-google';
import IconBrandGoogleDrive from '~icons/tabler/brand-google-drive';
import IconBrandYoutube from '~icons/tabler/brand-youtube';
import IconBrandTwitch from '~icons/tabler/brand-twitch';
import IconBrandDiscord from '~icons/tabler/brand-discord';
import IconBrandTelegram from '~icons/tabler/brand-telegram';
import IconBrandWhatsapp from '~icons/tabler/brand-whatsapp';
import IconBrandSlack from '~icons/tabler/brand-slack';
import IconBrandReddit from '~icons/tabler/brand-reddit';
import IconBrandX from '~icons/tabler/brand-x';
import IconBrandMastodon from '~icons/tabler/brand-mastodon';
import IconBrandBluesky from '~icons/tabler/brand-bluesky';
import IconBrandInstagram from '~icons/tabler/brand-instagram';
import IconBrandFacebook from '~icons/tabler/brand-facebook';
import IconBrandLinkedin from '~icons/tabler/brand-linkedin';
import IconBrandWikipedia from '~icons/tabler/brand-wikipedia';

export const ICON_REGISTRY: Record<string, Component> = {
  world: IconWorld,
  home: IconHome,
  mail: IconMail,
  clock: IconClock,
  calendar: IconCalendar,
  'calendar-event': IconCalendarEvent,
  news: IconNews,
  search: IconSearch,
  star: IconStar,
  heart: IconHeart,
  settings: IconSettings,
  help: IconHelp,
  'external-link': IconExternalLink,
  link: IconLink,
  folder: IconFolder,
  bookmark: IconBookmark,
  rss: IconRss,
  cloud: IconCloud,
  sun: IconSun,
  moon: IconMoon,
  download: IconDownload,
  upload: IconUpload,
  'device-tv': IconDeviceTv,
  movie: IconMovie,
  music: IconMusic,
  'shopping-cart': IconShoppingCart,
  code: IconCode,
  book: IconBook,
  map: IconMap,
  'building-bank': IconBuildingBank,
  'brand-github': IconBrandGithub,
  'brand-gitlab': IconBrandGitlab,
  'brand-google': IconBrandGoogle,
  'brand-google-drive': IconBrandGoogleDrive,
  'brand-youtube': IconBrandYoutube,
  'brand-twitch': IconBrandTwitch,
  'brand-discord': IconBrandDiscord,
  'brand-telegram': IconBrandTelegram,
  'brand-whatsapp': IconBrandWhatsapp,
  'brand-slack': IconBrandSlack,
  'brand-reddit': IconBrandReddit,
  'brand-x': IconBrandX,
  'brand-mastodon': IconBrandMastodon,
  'brand-bluesky': IconBrandBluesky,
  'brand-instagram': IconBrandInstagram,
  'brand-facebook': IconBrandFacebook,
  'brand-linkedin': IconBrandLinkedin,
  'brand-wikipedia': IconBrandWikipedia,
};

/** Sorted for display in the settings UI (icon name field hints). */
export const ICON_NAMES: readonly string[] = Object.keys(ICON_REGISTRY).sort();
