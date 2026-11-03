"""강의계획서 내보내기 파일(courses_*.xls, 실제로는 HTML 표)을 data.js 로 바꾼다.

사용: python tools/build_data.py <courses.xls>
동아리(Non-credit) 강좌는 점수 계산이 없어 뺀다. 공동강의교사 칸의 이메일은 지운다.
"""
import html
import json
import re
import sys
from pathlib import Path

# 데이터 행(61칸)의 열 번호
NAME, ENG, CODE, GRADE_YR, SUBJ, UNIT, BLOCK, TEACHER, CO, METHOD = 4, 5, 6, 2, 9, 11, 12, 14, 15, 17
MID, FIN, PERF, TOTAL = 18, 19, 24, 25
ITEM0 = 26  # 수행평가 1~5: 영역, 반영비율, 평가내용, 평가시기, 논술형 반영점수
EMPTY = {"", "없음", "n/a", "NA", ".", "-"}


def num(x):
    try:
        return float(x)
    except ValueError:
        return 0.0


def clean(s):
    return re.sub(r"\s+", " ", s).strip()


def short(x):
    return int(x) if x == int(x) else x


def rows_of(src):
    out = []
    for r in re.findall(r"<tr[^>]*>(.*?)</tr>", src, re.S | re.I):
        if "<table" in r.lower():
            continue
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", r, re.S | re.I)
        cells = [html.unescape(re.sub(r"<[^>]+>", "", c)).strip() for c in cells]
        if len(cells) == 61 and cells[0].isdigit():
            out.append(cells)
    return out


def main(path):
    src = Path(path).read_text(encoding="utf-8")
    title = re.search(r"<h3>(.*?)</", src)
    term = clean(re.sub(r"<[^>]+>", "", title.group(1))) if title else ""
    courses = []
    for r in rows_of(src):
        if r[METHOD].startswith("Non-credit"):
            continue
        mid, fin, perf = num(r[MID]), num(r[FIN]), num(r[PERF])
        items = []
        for k in range(5):
            name, w = clean(r[ITEM0 + 5 * k]), num(r[ITEM0 + 5 * k + 1])
            if w > 0:
                items.append([name or f"수행평가{k + 1}", short(w), clean(r[ITEM0 + 5 * k + 3])])
        if abs(mid + fin + perf - 100) > 0.01 or abs(sum(i[1] for i in items) - perf) > 0.01:
            print("비율 합이 맞지 않음:", r[NAME], r[TEACHER], file=sys.stderr)
        co = re.sub(r"\(?[\w.+-]+@[\w.-]+\)?", "", r[CO])
        co = "" if clean(co) in EMPTY else clean(co)
        courses.append({
            "n": clean(r[NAME]),
            "e": "" if clean(r[ENG]) in EMPTY else clean(r[ENG]),
            "c": "" if r[CODE] in EMPTY else r[CODE],
            "y": r[GRADE_YR],
            "s": r[SUBJ],
            "u": short(num(r[UNIT])),
            "b": r[BLOCK].replace(" ", ""),
            "t": clean(r[TEACHER]),
            "co": co,
            "g": r[METHOD],
            "w": [short(mid), short(fin), short(perf)],
            "p": items,
        })
    out = Path(__file__).resolve().parent.parent / "data.js"
    body = json.dumps({"term": term, "courses": courses}, ensure_ascii=False, separators=(",", ":"))
    out.write_text("window.COURSE_DATA=" + body + ";\n", encoding="utf-8")
    print(f"{len(courses)}개 강좌 -> {out}")


if __name__ == "__main__":
    main(sys.argv[1])
