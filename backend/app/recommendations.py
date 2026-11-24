"""Rule-based study advice. Rules are transparent; they are NOT learned by the ML model.
`basis` tells the user whether a tip comes from the model input, a self-reported field
that the model never saw, or general study advice."""


def build_recommendations(req: dict, mapped: dict, score: float, risk: str, what_if: list) -> list[dict]:
    recs = []

    def add(title, detail, priority, basis):
        recs.append({"title": title, "detail": detail, "priority": priority, "basis": basis})

    if req["attendance_percent"] < 85:
        add("Improve attendance",
            f"Your attendance is {req['attendance_percent']:.0f}%. In the training data, more absences "
            "are associated with lower final grades. Aim for 90%+.",
            "high" if req["attendance_percent"] < 75 else "medium", "model")
    if req["daily_study_hours"] < 2:
        add("Increase focused study time",
            f"You study about {req['daily_study_hours']:.1f} h/day. Try 2-3 focused hours with short breaks "
            "(e.g. 50 min study / 10 min rest).", "high" if req["daily_study_hours"] < 1 else "medium", "model")
    if req["previous_marks"] < req["first_term_marks"] - 5:
        add("Reverse the downward trend",
            "Your latest marks are lower than your earlier ones. Review the topics you lost marks on and "
            "ask your teacher for feedback early.", "high", "model")
    if req["previous_marks"] < 50:
        add("Strengthen the fundamentals",
            "Recent marks are below 50%. Revisit core concepts, solve past papers and consider peer tutoring.",
            "high", "model")
    if req["past_failures"] > 0:
        add("Close old gaps",
            "Past failures often point to missing foundations. Identify those topics and schedule weekly revision.",
            "medium", "model")

    # Self-reported fields (not used by the ML model)
    if req["assignment_completion"] < 80:
        add("Complete your assignments",
            f"You report {req['assignment_completion']:.0f}% assignment completion. Use a planner and finish "
            "work before deadlines - assignments are practice for exams.", "high" if req["assignment_completion"] < 60 else "medium",
            "self-reported")
    if req["sleep_hours"] < 7:
        add("Protect your sleep",
            f"You report {req['sleep_hours']:.1f} h of sleep. Most students concentrate and remember better "
            "with 7-9 hours.", "medium", "self-reported")
    elif req["sleep_hours"] > 10:
        add("Check your sleep routine", "Very long sleep can reduce study time; keep a consistent schedule.",
            "low", "self-reported")
    if req["class_participation"] <= 2:
        add("Participate more in class",
            "Ask at least one question per class - explaining and asking help you retain material.", "medium",
            "self-reported")
    if req["study_consistency"] <= 2:
        add("Build a consistent routine",
            "Short daily sessions beat last-minute cramming. Fix a daily slot and track it.", "medium",
            "self-reported")
    if req["number_of_subjects"] >= 8 and req["daily_study_hours"] < 3:
        add("Prioritise your subjects",
            "With many subjects, split time by difficulty and upcoming deadlines.", "low", "self-reported")

    if not mapped["higher"] == "yes":
        add("Keep your options open",
            "Setting a goal for further education is associated with better outcomes in the data.", "low", "model")

    if risk == "High":
        add("Talk to a teacher or counsellor",
            "The estimate is below the pass mark. Early academic support makes the biggest difference.",
            "high", "general")
    if not recs:
        add("Keep it up!", "Your inputs look healthy. Maintain your routine and keep revising regularly.",
            "low", "general")

    order = {"high": 0, "medium": 1, "low": 2}
    return sorted(recs, key=lambda r: order[r["priority"]])
