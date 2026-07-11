"""Deterministic mock navigation answers for the AI-HPS demo."""
import json
import re
from collections import deque
from functools import lru_cache
from pathlib import Path
from typing import Any


DATA_PATH = Path(__file__).resolve().parent / "data" / "mock_navigation_routes.json"

_NAV_WORDS = re.compile(
    r"\b(where|how|direction|directions|direct|guide|route|path|go|go to|reach|find|located|location|"
    r"comment|aller|ou se trouve|où se trouve|trouver|chemin|itineraire|itinéraire|guider|dirige)\b",
    re.IGNORECASE,
)
_ORIGIN_HINTS = re.compile(
    r"\b(from|at|near|starting from|located at|i am at|i'm at|je suis a|je suis à|depuis|a partir de|à partir de)\b",
    re.IGNORECASE,
)


@lru_cache(maxsize=1)
def load_navigation_data() -> dict[str, Any]:
    with DATA_PATH.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    data["_landmark_by_id"] = {item["id"]: item for item in data["landmarks"]}
    data["_aliases"] = _build_aliases(data["landmarks"])
    data["_graph"] = _build_graph(data["corridors"], data["_landmark_by_id"])
    return data


def _build_aliases(landmarks: list[dict[str, Any]]) -> list[tuple[str, str]]:
    aliases: list[tuple[str, str]] = []
    for landmark in landmarks:
        names = [landmark["name"], landmark["id"].replace("_", " "), *landmark.get("aliases", [])]
        for alias in names:
            normalized = _normalize(alias)
            if normalized:
                aliases.append((normalized, landmark["id"]))
    return sorted(set(aliases), key=lambda item: len(item[0]), reverse=True)


def _build_graph(corridors: list[dict[str, str]], landmarks: dict[str, dict[str, Any]]) -> dict[str, list[tuple[str, str]]]:
    graph: dict[str, list[tuple[str, str]]] = {}
    for edge in corridors:
        start = edge["from"]
        end = edge["to"]
        instruction = edge["instruction"]
        graph.setdefault(start, []).append((end, instruction))
        graph.setdefault(end, []).append((start, _reverse_instruction(start, end, landmarks)))
    return graph


def _normalize(text: str) -> str:
    text = text.lower()
    replacements = {
        "é": "e", "è": "e", "ê": "e", "à": "a", "â": "a", "ô": "o", "î": "i", "ï": "i", "ç": "c",
        "-": " ",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", text)).strip()


def _reverse_instruction(start: str, end: str, landmarks: dict[str, dict[str, Any]]) -> str:
    start_name = landmarks[start]["name"]
    end_name = landmarks[end]["name"]
    return f"Go back along the same corridor from {end_name} toward {start_name}."


def _find_landmark_matches(query: str) -> list[tuple[int, str]]:
    normalized = _normalize(query)
    data = load_navigation_data()
    matches: list[tuple[int, int, str]] = []
    for alias, landmark_id in data["_aliases"]:
        for match in re.finditer(rf"\b{re.escape(alias)}\b", normalized):
            matches.append((match.start(), -len(alias), landmark_id))
    found: list[tuple[int, str]] = []
    seen: set[str] = set()
    for _, _, landmark_id in sorted(matches):
        if landmark_id not in seen:
            pos = next(item[0] for item in sorted(matches) if item[2] == landmark_id)
            found.append((pos, landmark_id))
            seen.add(landmark_id)
    return found


def _infer_origin_destination(query: str) -> tuple[str, str] | None:
    data = load_navigation_data()
    matches = _find_landmark_matches(query)
    found = [landmark_id for _, landmark_id in matches]
    if not found:
        return None

    destination = found[-1]
    origin = data.get("default_origin", "main_entrance")

    normalized = _normalize(query)
    if len(found) >= 2:
        hint = _ORIGIN_HINTS.search(normalized)
        if hint:
            before_hint = [landmark_id for pos, landmark_id in matches if pos < hint.start()]
            after_hint = [landmark_id for pos, landmark_id in matches if pos >= hint.start()]
            if before_hint and after_hint:
                origin = after_hint[0]
                destination = before_hint[-1]
            elif len(after_hint) >= 2:
                origin = after_hint[0]
                destination = after_hint[-1]
            else:
                origin = found[0]
                destination = found[-1]
        else:
            destination = found[0]
            origin = data.get("default_origin", "main_entrance")

    if origin == destination:
        return None
    return origin, destination


def _shortest_path(origin: str, destination: str) -> list[tuple[str, str, str]] | None:
    data = load_navigation_data()
    graph = data["_graph"]
    queue = deque([(origin, [])])
    seen = {origin}
    while queue:
        node, path = queue.popleft()
        if node == destination:
            return path
        for nxt, instruction in graph.get(node, []):
            if nxt in seen:
                continue
            seen.add(nxt)
            queue.append((nxt, [*path, (node, nxt, instruction)]))
    return None


def _format_answer(origin: str, destination: str, path: list[tuple[str, str, str]], language: str) -> dict[str, Any]:
    data = load_navigation_data()
    landmarks = data["_landmark_by_id"]
    origin_name = landmarks[origin]["name"]
    dest_name = landmarks[destination]["name"]
    minutes = max(2, len(path) * 2)
    steps = [{"instruction": instruction} for _, _, instruction in path]

    if language == "FR":
        answer = (
            f"Depuis {origin_name}, suivez cet itineraire simule vers {dest_name}. "
            f"Temps estime: environ {minutes} minutes. "
            "Cette orientation utilise la carte de demonstration AI-HPS, pas un plan officiel de l'hopital."
        )
        disclaimer = "Itineraire simule pour la demonstration; confirmez avec l'accueil si necessaire."
    else:
        answer = (
            f"From {origin_name}, follow this simulated route to {dest_name}. "
            f"Estimated walking time: about {minutes} minutes. "
            "This uses the AI-HPS demonstration map, not an official hospital floor plan."
        )
        disclaimer = "Simulated route for demonstration; confirm at Reception if needed."

    return {
        "answer": answer,
        "steps": steps,
        "key_steps": steps,
        "risk_level": "low",
        "source": f"{data['name']} ({data['version']}) - {data['map_url']}",
        "disclaimer": disclaimer,
        "map_url": data["map_url"],
        "origin": origin_name,
        "destination": dest_name,
        "estimated_time_minutes": minutes,
    }


def find_navigation_answer(query: str, language: str = "EN") -> dict[str, Any] | None:
    if not query or not _NAV_WORDS.search(query):
        return None
    inferred = _infer_origin_destination(query)
    if not inferred:
        return None
    origin, destination = inferred
    path = _shortest_path(origin, destination)
    if not path:
        return None
    return _format_answer(origin, destination, path, language)
