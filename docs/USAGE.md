# Usage Guide

Open **http://localhost:3000** after `docker-compose up --build`.

The app has a nav bar at the top with five options: **Quiz**, **Search
Actor**, **Favorites**, **Surprise Me**, and **Filters**.

## 1. Quiz

The main flow. Answer four quick steps and get a ranked pick.

1. **Step 1 — Mood:** pick one of sixteen mood cards (Happy, Adventurous,
   Romantic, Horror, Sci-Fi, Crime, and more) — each maps to a set of genres
   under the hood.
2. **Step 2 — Occasion:** who you're watching with (Just Me, Date Night,
   Friends, Family) — this nudges genres too (e.g. Family adds
   Animation/Family and drops Horror).
3. **Step 3 — Era:** Any Era, Last 5 Years, Last 10 Years, or Classics
   (25+ years old).
4. **Step 4 — Special preference (optional):** True Story, Mind-Bending,
   Space, Heist/Crime, Superhero, or skip with No Preference.

The engine combines all of this into a genre list and calls the
preference-matching endpoint. Results come back as a shuffled list of up to
20 movies you can page through one at a time.

**Example:** Mood *Adventurous* + occasion *Family* + era *Any* → genres end
up something like `Action, Adventure, Fantasy, Animation, Family` (with
Horror explicitly excluded for the family occasion).

## 2. Search Actor

Search the catalog by actor name.

1. Type an actor's name (e.g. "Tom Hanks") into the search box.
2. Hit Search.
3. The grid fills with every movie in the catalog featuring that actor,
   sorted by rating.

**Note:** only about half the catalog has real cast data attached (see the
README's [Data source](../README.md#data-source) section for why) — a
well-known actor returning no results usually means their movies happen to
fall in the half of the catalog that doesn't have cast data, not a bug.

## 3. Favorites

Tap **♡ Save to Favorites** on any result card to add it to your watchlist.
The **Favorites** tab shows everything you've saved — this list lives in
your browser (`localStorage`), so it survives a page refresh but is local to
that browser, not synced anywhere.

## 4. Surprise Me

Skips the quiz entirely and gives you one random pick straight away,
respecting whatever filters are currently set (see below). Good for "just
pick something" moments.

## 5. Filters

Click **⚙️ Filters** to open a panel with:

- **From year / To year** — restrict results to a release-year range.
- **Minimum rating** — a slider from 0 to 9.

These apply to Quiz results and Surprise Me picks alike. Leave a field blank
for "any."

## Reading a result card

```
┌───────────────────────────────────┐
│ [POSTER]   8.0★                    │  ← poster + rating badge
│            Inside Out              │
│            Drama, Comedy, Animation│
│            2015                    │
│            <overview text>         │
│            Amy Poehler, ...        │  ← cast, when available
│            Where to Watch  Full →  │
└───────────────────────────────────┘
[ ♡ Save ]  [ 👍 Like — more like this ]  [ 👎 Not this one — Next ]
```

Liking a pick doesn't just move to the next movie — it also folds that
movie's genres into your *next* batch of recommendations, so results
gradually lean toward what you've actually enjoyed in the session.

## Tips

- Combine the quiz with the filters panel for the most targeted results —
  e.g. "Adventurous mood + Classics era + minimum rating 7" surfaces older,
  well-regarded action/adventure titles.
- The API is open at **http://localhost:8000/docs** if you want to call it
  directly.
