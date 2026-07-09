import type { IJob } from '@/models/Job';

// Whether a job is still open for new applications right now. There's no
// background cron on this deployment, so a job that has passed its
// application deadline or filled its applicant cap isn't closed the moment
// that happens -- it's detected (and isActive lazily flipped + persisted)
// the next time someone looks at it here. Called from the job-detail route
// and the application-submission route, i.e. wherever a real user action
// depends on knowing the current state.
export async function isJobOpenForApplications(job: IJob): Promise<boolean> {
  if (!job.isActive) return false;

  const deadlinePassed = Boolean(job.applicationDeadline && new Date() > job.applicationDeadline);
  const capReached = job.maxApplicants != null && job.applicantCount >= job.maxApplicants;

  if (deadlinePassed || capReached) {
    job.isActive = false;
    await job.save();
    return false;
  }

  return true;
}
