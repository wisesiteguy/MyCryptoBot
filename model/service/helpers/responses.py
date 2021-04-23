from collections import namedtuple


RESPONSES = namedtuple(
    'Responses',
    [
        "STRATEGY_INVALID",
        "SIGNAL_GENERATION_INPROGRESS",
        "JOB_NOT_FOUND",
        "FINISHED",
        "IN_QUEUE",
        "WAITING",
        "FAILED",
    ]
)


Responses = RESPONSES(
    STRATEGY_INVALID=lambda strategy: {"response": f"{strategy} is not a valid strategy.", "success": False},
    SIGNAL_GENERATION_INPROGRESS=lambda job_id: {
        "response": f"Signal generation process started.", "success": True, "job_id": job_id
    },
    FINISHED=lambda result: {"status": 'finished', "success": result},
    JOB_NOT_FOUND={"status": 'job not found'},
    IN_QUEUE={"status": 'job not found'},
    WAITING={"status": 'waiting'},
    FAILED={"status": 'failed'},
)