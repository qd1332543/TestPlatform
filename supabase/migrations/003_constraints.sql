-- Required by suite import upserts and executor registration upserts.

alter table test_suites
  add constraint test_suites_project_suite_key_unique unique (project_id, suite_key);

alter table executors
  add constraint executors_name_unique unique (name);
