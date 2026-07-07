from langgraph.graph import StateGraph, END
from app.schemas import DebateState
from app.nodes.debater import debater_a_node, debater_b_node
from app.nodes.judge import judge_node
from app.nodes.convergence import convergence_node, should_continue


def build_graph():
    workflow = StateGraph(DebateState)

    workflow.add_node("debater_a", debater_a_node)
    workflow.add_node("debater_b", debater_b_node)
    workflow.add_node("convergence", convergence_node)
    workflow.add_node("judge", judge_node)

    workflow.set_entry_point("debater_a")
    workflow.add_edge("debater_a", "debater_b")
    workflow.add_edge("debater_b", "convergence")
    workflow.add_conditional_edges(
        "convergence",
        should_continue,
        {"debater_a": "debater_a", "judge": "judge"},
    )
    workflow.add_edge("judge", END)

    return workflow.compile()


graph = build_graph()
