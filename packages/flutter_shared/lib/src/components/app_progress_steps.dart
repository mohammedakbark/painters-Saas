import 'package:flutter/material.dart';

import '../tokens/app_colors.dart';
import '../tokens/app_spacing.dart';
import '../tokens/app_typography.dart';

enum AppStepState { done, current, todo }

/// One step of an [AppProgressSteps].
class AppStep {
  const AppStep(this.label, this.state);

  final String label;
  final AppStepState state;
}

/// Where a record is in a fixed sequence, such as an order's steps
/// (CUS-006, like the web `ProgressSteps`): done steps are green with a
/// tick, the current step has a ring, later steps are grey. Screen readers
/// hear each step with its state in words.
class AppProgressSteps extends StatelessWidget {
  const AppProgressSteps({super.key, required this.steps});

  final List<AppStep> steps;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final (index, step) in steps.indexed)
          Expanded(
            child: _Step(step: step, first: index == 0),
          ),
      ],
    );
  }
}

class _Step extends StatelessWidget {
  const _Step({required this.step, required this.first});

  final AppStep step;
  final bool first;

  @override
  Widget build(BuildContext context) {
    final done = step.state == AppStepState.done;
    final current = step.state == AppStepState.current;
    final reached = step.state != AppStepState.todo;
    const dot = AppSpacing.s24;
    return Semantics(
      label:
          '${step.label}, ${done
              ? 'done'
              : current
              ? 'current step'
              : 'not yet'}',
      excludeSemantics: true,
      child: Column(
        children: [
          SizedBox(
            height: dot,
            child: Stack(
              alignment: Alignment.center,
              children: [
                if (!first)
                  Positioned(
                    left: 0,
                    right: 0,
                    child: FractionallySizedBox(
                      alignment: Alignment.centerLeft,
                      widthFactor: 0.5,
                      child: Container(
                        height: 2,
                        color: reached
                            ? AppColors.statusSuccess
                            : AppColors.borderDefault,
                      ),
                    ),
                  ),
                Container(
                  width: dot,
                  height: dot,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: done
                        ? AppColors.statusSuccess
                        : AppColors.surfaceDefault,
                    border: Border.all(
                      width: 2,
                      color: done
                          ? AppColors.statusSuccess
                          : current
                          ? AppColors.brandPrimary
                          : AppColors.borderStrong,
                    ),
                    boxShadow: current
                        ? [
                            BoxShadow(
                              color: AppColors.brandPrimarySoft,
                              spreadRadius: 4,
                            ),
                          ]
                        : null,
                  ),
                  child: done
                      ? Icon(
                          Icons.check,
                          size: AppSpacing.s16,
                          color: AppColors.surfaceDefault,
                        )
                      : null,
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.s8),
          Text(
            step.label,
            textAlign: TextAlign.center,
            style: AppTypography.caption.copyWith(
              fontWeight: FontWeight.w600,
              color: reached ? AppColors.textPrimary : AppColors.textDisabled,
            ),
          ),
        ],
      ),
    );
  }
}
