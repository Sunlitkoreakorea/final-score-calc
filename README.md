# 기말 점수 계산기

원점수 80(목표는 바꿀 수 있음)을 넘기려면 기말고사에서 몇 점이 필요한지 계산하는 정적 페이지.

- 수업 검색(이름·영문명·선생님·강좌번호·블록·초성) → 눌러서 내 수업에 추가
- 수업마다 중간고사 점수, 수행평가 항목별 점수(또는 `수행평가 만점` 스위치), 목표 원점수
- 기말 필요 점수 = (목표 − 중간 반영점 − 수행평가 합) ÷ 기말 반영비율 × 100, 0.1점 단위 올림
- 입력값은 이 브라우저의 localStorage(`final-score-calc:v1`)에만 저장

## 수업 데이터 갱신

강의계획서 내보내기 파일(`courses_YYYY_N.xls`, 실제로는 HTML 표)을 받아서:

```
python tools/build_data.py "C:/Users/user/Downloads/courses_2026_2(3).xls"
```

`data.js`가 다시 만들어진다. 동아리(Non-credit) 강좌는 빠지고, 공동강의교사 칸의 이메일은 지워진다.
배포한 뒤 `data.js` 를 바꾸면 index.html 의 `data.js?v=N` 숫자도 올릴 것 (Pages 캐시 10분).

## 확인

```
node test/core.test.js
```
